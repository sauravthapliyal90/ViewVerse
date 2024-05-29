import mongoose,{ Schema } from "mongoose";

const likeSchema = new Schema({
    Comment: {
        type: Schema.Types.ObjectId,
        ref: "Comment"
    },
    video:{
        type: Schema.Types.ObjectId,
        ref: "Video"
    } ,
    likedBy: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    tweet: {
        type: Schema.Types.ObjectId,
        ref: "Tweet"
    }
    
})

export const Like = mongoose.model("Like", likeSchema)