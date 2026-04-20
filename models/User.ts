import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      minLength: 8,
    },
  },
  { timestamps: true }
);

// BUG FIX: Check mongoose.models.User first to prevent
// "Cannot overwrite model once compiled" error on hot reload in dev mode.
const User = mongoose.models.User || mongoose.model("User", UserSchema);

export default User;
