class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.statuscode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
    this.Success = statusCode < 400;
  }
}

export default ApiResponse;