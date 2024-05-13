import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import uploadOnCloudinary from "../utils/cloudinary.js"


const generateAccessAndRefereshToken = async(userId) => {
    try {
        const user =  await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refereshToken = user.generateRefreshToken()

        user.refereshToken = refereshToken
        await user.save({ validateBeforeSave: false })
        
        return {accessToken, refereshToken}

    } catch (error) {
        throw new ApiError(500, "something went wrong while genrating refresh token")
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
    console.log("sas",req.body);

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

    if(!username || !email){
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

    const {accessToken, refreshToken} = await generateAccessAndRefereshToken(user._id)

    const loggedInUser = await User.findById(user._id).
    select("-password, -accessToken")

    const option ={
        httpOnly: true,
        secure: true
    }

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

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
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
    .json(new ApiResponse(200, {}, "User loggdout successfully"))
})

export {
    registerUser,
    loginUser,
    logoutUser
};