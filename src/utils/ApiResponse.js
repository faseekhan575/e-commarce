class ApiResponse{
    constructor(
        status,data,message="Sucess"
    ){
        this.statuscode=status,
        this.data=data,
        this.message=message,
        this.Success=this.statuscode<400
    }
}

export default ApiResponse