import mongoose from "mongoose";

const lectureSchema = new mongoose.Schema({
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Topic'
  },

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Faculty'
  },

  title: {
    type: String,
    required: true,
  },

  videoUrl: {
    type: String,
    required: true,
    unique: true
  },

  cloudinaryPublicId: {
    type: String,
    required: true,
    unique: true
  },

  thumbnailUrl: {
    type: String,
    required: true
  },

  duration: {
    type: Number,
    default: 0,
  },

  description: {
    type: String
  }

}, { timestamps: true });

export const Lecture = mongoose.model("Lecture", lectureSchema);