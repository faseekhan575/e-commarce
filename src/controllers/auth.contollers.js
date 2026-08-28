import { getIO } from "../socket.js";
import { asynchandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { google } from "googleapis";

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTPEmail = async (email, otp) => {
  console.log("📧 Sending OTP to:", email);
  console.log("🔑 CLIENT_ID:", process.env.GMAIL_CLIENT_ID ? "SET" : "MISSING");
  console.log("🔑 CLIENT_SECRET:", process.env.GMAIL_CLIENT_SECRET ? "SET" : "MISSING");
  console.log("🔑 REFRESH_TOKEN:", process.env.GMAIL_REFRESH_TOKEN ? "SET" : "MISSING");
  console.log("🔑 EMAIL_USER:", process.env.EMAIL_USER);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  oauth2Client.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });

  console.log("🔄 Getting access token...");
  const { token: accessToken } = await oauth2Client.getAccessToken();
  console.log("✅ Access token received:", accessToken ? "YES" : "NO");

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });

  const message = [
    `To: ${email}`,
    `From: Vault <${process.env.EMAIL_USER}>`,
    `Subject: Your OTP Code`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    `<h2>Your OTP Code</h2>
     <p>Use this code to verify your account:</p>
     <h1>${otp}</h1>
     <p>This code expires in 10 minutes.</p>`,
  ].join("\n");

  const encodedMessage = Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  console.log("📤 Sending via Gmail API...");
  const result = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: encodedMessage },
  });
  console.log("✅ Email sent! Message ID:", result.data.id);
};

const issueTokens = async (user, res) => {
  const accessToken  = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  user.tokens.push(refreshToken);
  await user.save({ validateBeforeSave: false });

  const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  };

  res
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions);

  return { accessToken, refreshToken };
};

export const register = asynchandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;

  if (!username || !email || !fullname || !password) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({ $or: [{ email }, { username }] });
  if (existingUser) {
    throw new ApiError(409, "User with this email or username already exists");
  }

  const otp       = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  const user = await User.create({
    username,
    email,
    fullname,
    password,
    otp,
    otpExpiry,
    isVerified: false,
  });

  try {
    await sendOTPEmail(email, otp);
  } catch (err) {
    console.error("❌ Email send error:", err.message);
    console.error("❌ Full error:", err);
    await User.findByIdAndDelete(user._id);
    throw new ApiError(500, "Failed to send OTP email: " + err.message);
  }

  res.status(201).json(
    new ApiResponse(201, {}, "OTP sent to your email. Please verify to activate your account")
  );
});

export const verifyOTP = asynchandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");
  if (user.isVerified) throw new ApiError(400, "User already verified");
  if (user.otp !== otp) throw new ApiError(400, "Invalid OTP");
  if (user.otpExpiry < new Date()) throw new ApiError(400, "OTP has expired. Please request a new one");

  user.isVerified = true;
  user.otp        = null;
  user.otpExpiry  = null;
  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } = await issueTokens(user, res);

  res.status(200).json(
    new ApiResponse(200, { accessToken, refreshToken, role: user.role }, "Account verified and logged in successfully")
  );
});

export const login = asynchandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) throw new ApiError(400, "Email and password are required");

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");
  if (!user.isVerified) throw new ApiError(403, "Please verify your email first");

  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) throw new ApiError(401, "Invalid credentials");

  const { accessToken, refreshToken } = await issueTokens(user, res);

  res.status(200).json(
    new ApiResponse(200, {
      _id:      user._id,
      accessToken,
      refreshToken,
      role:     user.role,
      email:    user.email,
      username: user.username,
      fullname: user.fullname,
      avatar:   user.avatar,
    }, "Logged in successfully")
  );
});

export const forgotPassword = asynchandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  const otp       = generateOTP();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  user.otp       = otp;
  user.otpExpiry = otpExpiry;
  await user.save({ validateBeforeSave: false });

  try {
    await sendOTPEmail(email, otp);
  } catch (err) {
    console.error("❌ Email send error:", err.message);
    console.error("❌ Full error:", err);
    throw new ApiError(500, "Failed to send OTP email: " + err.message);
  }

  res.status(200).json(
    new ApiResponse(200, {}, "OTP sent to your email for password reset")
  );
});

export const verifyResetOTP = asynchandler(async (req, res) => {
  const { email, otp } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");
  if (user.otp !== otp) throw new ApiError(400, "Invalid OTP");
  if (user.otpExpiry < new Date()) throw new ApiError(400, "OTP has expired. Please request a new one.");

  user.otp       = null;
  user.otpExpiry = null;
  await user.save({ validateBeforeSave: false });

  res.status(200).json(
    new ApiResponse(200, {}, "OTP verified. You can now reset your password.")
  );
});

export const resetPassword = asynchandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");
  if (user.otp !== otp) throw new ApiError(400, "Invalid OTP");
  if (user.otpExpiry < new Date()) throw new ApiError(400, "OTP expired");

  user.otp       = null;
  user.otpExpiry = null;
  user.password  = newPassword;
  await user.save();

  res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"));
});

// ============================================================
// GOOGLE OAUTH LOGIN / SIGN-IN (POPUP & REDIRECT FLOWS)
// ============================================================

const getOAuth2Client = (redirectUri) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.GMAIL_CLIENT_SECRET;
  const callbackUrl =
    redirectUri ||
    `http://localhost:${process.env.PORT || 4000}/api/v1/auth/google/callback`;

  return new google.auth.OAuth2(clientId, clientSecret, callbackUrl);
};

/**
 * 1. Direct Browser Redirect to Google Account Selector
 * URL: GET /api/v1/auth/google/redirect
 */
export const redirectToGoogle = (req, res) => {
  const oauth2Client = getOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "select_account", // Always prompt user to pick Google account
  });

  return res.redirect(authUrl);
};

/**
 * 2. Google OAuth Callback Handler
 * URL: GET /api/v1/auth/google/callback
 */
export const googleOAuthCallback = asynchandler(async (req, res) => {
  const { code } = req.query;

  if (!code) {
    throw new ApiError(400, "Google authorization code is missing");
  }

  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data: profile } = await oauth2.userinfo.get();

  const email = profile.email?.toLowerCase().trim();
  const fullname = profile.name;
  const avatarUrl = profile.picture;
  const googleId = profile.id;

  if (!email) {
    throw new ApiError(400, "Google account did not return a valid email address");
  }

  let user = await User.findOne({
    $or: [
      { googleId: googleId || "non_existent_id" },
      { email },
    ],
  });

  if (user) {
    if (!user.googleId && googleId) user.googleId = googleId;
    if (!user.avatar?.url && avatarUrl) user.avatar = { url: avatarUrl, public_id: "" };
    user.isVerified = true;
    if (user.authProvider !== "google" && !user.password) {
      user.authProvider = "google";
    }
    await user.save({ validateBeforeSave: false });
  } else {
    const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    let uniqueUsername = baseUsername;
    let counter = 1;

    while (await User.findOne({ username: uniqueUsername })) {
      uniqueUsername = `${baseUsername}${Math.floor(100 + Math.random() * 900)}${counter}`;
      counter++;
    }

    user = await User.create({
      fullname: fullname ? fullname.trim() : baseUsername,
      username: uniqueUsername,
      email,
      googleId: googleId || `google_${Date.now()}`,
      authProvider: "google",
      avatar: avatarUrl ? { url: avatarUrl, public_id: "" } : { url: "", public_id: "" },
      isVerified: true,
    });
  }

  const { accessToken } = await issueTokens(user, res);

  const frontendUrl =
    process.env.CORS_ORIGIN ||
    process.env.CROS_ORIGIN ||
    "http://localhost:5173";

  const targetUrl = `${frontendUrl.replace(/\/+$/, "")}/?login=success&token=${accessToken}&userId=${user._id}&role=${user.role}`;
  return res.redirect(targetUrl);
});

/**
 * 3. JSON API for React Popup (@react-oauth/google / One-Tap)
 * URL: POST /api/v1/auth/google
 */
export const googleLogin = asynchandler(async (req, res) => {
  const { idToken, credential, accessToken: googleAccessToken, email: rawEmail, fullname: rawName, avatar: rawAvatar, googleId: rawGoogleId } = req.body;

  let email = rawEmail;
  let fullname = rawName;
  let avatarUrl = rawAvatar;
  let googleId = rawGoogleId;

  const tokenToVerify = idToken || credential;

  // If Google ID Token / credential was provided, verify with Google API
  if (tokenToVerify) {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.GMAIL_CLIENT_ID;
      const oauth2Client = new google.auth.OAuth2(clientId);

      const ticket = await oauth2Client.verifyIdToken({
        idToken: tokenToVerify,
        audience: clientId ? [clientId] : undefined,
      });

      const payload = ticket.getPayload();
      if (payload) {
        email = payload.email;
        fullname = payload.name || fullname;
        avatarUrl = payload.picture || avatarUrl;
        googleId = payload.sub || googleId;
      }
    } catch (verifyErr) {
      console.warn("⚠️ Local Google verifyIdToken fallback to tokeninfo:", verifyErr.message);

      // Fallback: verify via Google tokeninfo endpoint
      try {
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${tokenToVerify}`);
        const tokenInfo = await response.json();

        if (tokenInfo && tokenInfo.email) {
          email = tokenInfo.email;
          fullname = tokenInfo.name || fullname;
          avatarUrl = tokenInfo.picture || avatarUrl;
          googleId = tokenInfo.sub || googleId;
        } else {
          throw new ApiError(401, "Invalid Google ID token");
        }
      } catch (fetchErr) {
        throw new ApiError(401, "Google token verification failed: " + fetchErr.message);
      }
    }
  }

  if (!email) {
    throw new ApiError(400, "Google authentication did not provide a valid email");
  }

  email = email.toLowerCase().trim();

  // Find user by googleId or by email
  let user = await User.findOne({
    $or: [
      { googleId: googleId || "non_existent_id" },
      { email },
    ],
  });

  if (user) {
    // Link googleId and mark verified if not already
    if (!user.googleId && googleId) {
      user.googleId = googleId;
    }
    if (!user.avatar?.url && avatarUrl) {
      user.avatar = { url: avatarUrl, public_id: "" };
    }
    user.isVerified = true;
    if (user.authProvider !== "google" && !user.password) {
      user.authProvider = "google";
    }
    await user.save({ validateBeforeSave: false });
  } else {
    // Generate clean unique username
    const baseUsername = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
    let uniqueUsername = baseUsername;
    let counter = 1;

    while (await User.findOne({ username: uniqueUsername })) {
      uniqueUsername = `${baseUsername}${Math.floor(100 + Math.random() * 900)}${counter}`;
      counter++;
    }

    user = await User.create({
      fullname: fullname ? fullname.trim() : baseUsername,
      username: uniqueUsername,
      email,
      googleId: googleId || `google_${Date.now()}`,
      authProvider: "google",
      avatar: avatarUrl ? { url: avatarUrl, public_id: "" } : { url: "", public_id: "" },
      isVerified: true,
    });
  }

  const { accessToken, refreshToken } = await issueTokens(user, res);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        _id: user._id,
        accessToken,
        refreshToken,
        role: user.role,
        email: user.email,
        username: user.username,
        fullname: user.fullname,
        avatar: user.avatar,
        authProvider: user.authProvider,
      },
      "Logged in with Google successfully"
    )
  );
});


export const getCurrentUser = asynchandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    "-password -tokens -otp -otpExpiry"
  );
  if (!user) throw new ApiError(404, "User not found");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Current user fetched successfully"));
});

export const logout = asynchandler(async (req, res) => {
  const token = req.cookies?.refreshToken;

  if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { tokens: token },
    });
  }

  const cookieOptions = { httpOnly: true, secure: true, sameSite: "none" };

  res
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .status(200)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});
