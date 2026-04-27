const asynchandler = (fn) => async (req, res, next) => {
   try {
       await fn(req, res, next);
   } catch (error) {
       let statusCode = 500; // default

       // If error.code is a valid HTTP code number
       if (typeof error.code === 'number' && error.code >= 100 && error.code < 1000) {
           statusCode = error.code;
       }

       res.status(statusCode).json({
           success: false,
           message: error.message || "Internal server error"
       });
   }
}

export { asynchandler }


//this is called a superfunction it will take a function and return a function