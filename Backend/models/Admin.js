import mongoose from "mongoose";
import bcrypt from "bcrypt";

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },

  password: {
    type: String,
    required: true
  },

  name: {
    type: String,
    default: ""
  },

  designation: {
    type: String,
    default: ""
  },

  phone: {
    type: String,
    default: ""
  },

  accessLevel: {
    type: String,
    default: "Super Admin"
  },

  adminCode: {
    type: String,
    default: ""
  },

  avatar: {
    type: String,
    default: "https://img.magnific.com/premium-vector/illustration-career-woman-with-laptop_1302918-36431.jpg"
  },

  allowedDomains: {
    type: [String],
    default: ["acadpro.edu", "iiitp.ac.in", "faculty.acadpro.edu"]
  }
}, { timestamps: true });

adminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});


adminSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

export const Admin = mongoose.model("Admin", adminSchema);