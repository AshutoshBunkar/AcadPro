import mongoose, { Schema } from "mongoose";

const replySchema = new Schema(
    {
        facultyId: {
            type: Schema.Types.ObjectId,
            ref: "Faculty",
            required: true
        },
        text: {
            type: String,
            required: true
        }
    },
    {
        timestamps: true
    }
);

const commentSchema = new Schema(
    {
        text: {
            type: String,
            required: true
        },
        lectureId: {
            type: Schema.Types.ObjectId,
            ref: "Lecture",
            required: true
        },
        studentId: {
            type: Schema.Types.ObjectId,
            ref: "Student",
            required: true
        },
        replies: [replySchema]
    },
    {
        timestamps: true
    }
);

export const Comment = mongoose.model("Comment", commentSchema);