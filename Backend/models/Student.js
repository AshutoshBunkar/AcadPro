import mongoose from "mongoose";
import bcrypt from "bcrypt";

const studentsSchema = new mongoose.Schema({
    sessionVersion: { type: Number, default: 0 },
    invitationPending: { type: Boolean, default: false },
  mis: {
    type: String,
    required: true,
    unique: true
  },

  name: {
    type: String,
    required: true
  },

  email:{
    type:String,
    required:true,
    unique:true
  },

  emailVerifiedAt: Date,

  password:{
    type:String,
    required:true
  },

  department: {
    type: String,
    required: true
  },

  year: {
    type: Number,
    required: true
  },

  section: { type: String, default: "A" },
  currentSemester: {
    type: Number,
    min: 1,
    max: 8,
    default: function () {
      return this.year ? (this.year - 1) * 2 + 1 : 1;
    }
  }
}, { timestamps: true });

studentsSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password , this.password)
}

export const Student = mongoose.model('Student' , studentsSchema);
export default Student;