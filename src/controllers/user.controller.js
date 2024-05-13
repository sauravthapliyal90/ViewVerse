import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import uploadOnCloudinary from "../utils/cloudinary.js"

const registerUser = asyncHandler(async (req, res) => {
    // get user details from front end
    // validation - not empty
    // check if user already exist username, email
    // check for images and avatar
    // uplaod then cloudinary
    // create user obj - create entry in db
    // remove password and refresh token field from response
    // check for user creation 
    // return res

    const {fullName, email, username, password} = req.body
    console.log("sas",email);

    // if(fullName === ""){
    //     throw new ApiError(400,"full name is req");
    // }

    if(
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ){
       throw new ApiError(400, "All feild are req")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if(existedUser){
        throw new ApiError(409, "User with email or username exist");
    }

   const avatarLocalPath =  req.files?.avatar[0]?.path;
   const coveImageLocalPath = req.files?.coverImage[0]?.path;

   if (!avatarLocalPath) {
     throw new ApiError(400, "avatar image is req")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coveImageLocalPath);
   
   console.log(avatar);
   console.log(coverImage);

    const user = await User.create({
    fullName,
    avatar : avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase() 

   })

   const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
   );

   if(!createdUser){
    throw new ApiError("500", "something wrong while registring user");
   }

   return res.status(201).json(
    new ApiResponse(200, createdUser, "user register successfully")
   )
})

export default registerUser;