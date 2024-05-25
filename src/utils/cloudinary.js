import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME , 
    api_key: process.env.CLOUDINARY_API_KEY , 
    api_secret: process.env.CLOUDINARY_API_SECRET// Click 'View Credentials' below to copy your API secret
});

const uploadOnClodinary = async (localFilePath) => {
try {
    if(!localFilePath) return null;
     
    const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: "auto"
    }).catch((err) =>{console.log("err a gya mc", err);})
    console.log("file is successfully upload",response);
    fs.unlink(localFilePath, (err) => {
        if (err) {
            console.error("Error deleting local file:", err);
        } else {
            console.log("Local file deleted successfully");
        }
    });
    return response;
} catch (error) {
    console.log(error);
    fs.unlinkSync(localFilePath) //remove the locally saved temprory file as thr upload operation got failed
    return null;
}
}

export default uploadOnClodinary;