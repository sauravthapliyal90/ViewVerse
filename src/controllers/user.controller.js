import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import uploadOnCloudinary from "../utils/cloudinary.js"


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        
        const user = await User.findById(userId)
        
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
    
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

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

    // console.log("sas",req.body);

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
    console.log(req.files);// testing
   const avatarLocalPath =  req.files?.avatar[0]?.path;
   const coveImageLocalPath = req.files?.coverImage[0]?.path;
   console.log(avatarLocalPath)
   if (!avatarLocalPath) {
     throw new ApiError(400, "avatar image is req")
   }

   const avatar = await uploadOnCloudinary(avatarLocalPath);
   const coverImage = await uploadOnCloudinary(coveImageLocalPath);
   
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

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data
    // username or email
    // find the user
    // password check
    // access and refresh token gen
    // send cooke

    const {email, username, password} = req.body;

    if(!username && !email){
        throw new ApiError(400, "username or email req")
    }
    
    const user = await User.findOne({
        $or:[{username}, {email}]
    })

    if(!user){
        throw new ApiError(404,"user doesnt exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)


    if(!isPasswordValid){
        throw new ApiError(401,"password incorrect")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password, -accessToken")

    const option ={
        httpOnly: true,
        secure: true
    }
    console.log(accessToken);
    console.log(refreshToken);
    return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken,
                refreshToken
            },
            "user logged In successfully"
        )
    )

})

const logoutUser = asyncHandler(async (req, res) => {
    
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }  
        },
        {
            new: true
        }
    )

    const option ={
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponse(200, {}, "User loggedout successfully"))
})

 const refreshAccessToken = asyncHandler(async(req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken ||req.body.refreshToken
    
    if(!incomingRefreshToken){
        throw new ApiError(401, "unauthorized req")
    }
    
   try {
     const decodedToken = jwt.verify(
         incomingRefreshToken,
         process.env.REFRESH_TOKEN_SECRET
     )
     console.log(decodedToken);
     const user = await User.findById(decodedToken?._id)
 
     if(!user){
         throw new ApiError(401, "Invalid refresh token")
     }
 
     if (incomingRefreshToken !== user?.refreshToken) {
         throw new ApiError(401, "refresh token is expired or used")
     }
 
     const option ={
         httpOnly: true,
         secure: true
     }
 
     const {accessToken , newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
 
     return res.status(200)
     .cookie("accessToken",accessToken, option)
     .cookie("refreshToken", newRefreshToken, option)
     .json(
         new ApiResponse(
             200,
             {accessToken, refreshToken: newRefreshToken},
             "access token is refreshed"
         )
     )
   } catch (error) {
       throw new ApiError(401, error?.message || "invalid refersh token")
   }
 })

 const changeCurrentPassword = asyncHandler(async(req, res) =>{
    const {oldPassword, newPassword} = req.body

   const user = await User.findById(req.user?._id)
   const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
   
   if(!isPasswordCorrect){
    throw new ApiError(400, "Invaild old password")
   }

   user.password = newPassword
   await user.save({validateBeforeSave: false})

   return res.status(200)
   .json(new ApiResponse(200, {},"password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req, res) =>{
    return res.status(200)
    .json(200, req.user,"current user fetch successfully")
})

const updateAccountDetails = asyncHandler(async (req, res)=>{
    const {fullName, email} = req.body

    if(!fullName || !email){
        throw new ApiError(400, "All feild required")
    }

    const user = await User.findByIdAndUpdate(
        req?.user._id,
        {
            $set:{
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details are updated"))
})

const updateUserAvatar = asyncHandler(async(req, res) =>{
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar) {
        throw new ApiError(400,"error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new: true}
    ).select("-password")
     
    return res.status(200)
    .json(new ApiResponse(200, user, "coverImage updated successfully"))
})
 
const updateUserCoverImage = asyncHandler(async(req, res) =>{
    const coverLocalPath = req.file?.path

    if (!coverLocalPath) {
        throw new ApiError(400,"cover file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverLocalPath)

    if (!coverImage) {
        throw new ApiError(400,"error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, user, "coverImage updated successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};