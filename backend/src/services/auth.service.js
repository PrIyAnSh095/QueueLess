// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import User from "../models/user.model.js";

// export const registerUser = async ({ name, email, password }) => {
//   const existingUser = await User.findOne({ email });
//   if (existingUser) {
//     throw new Error("User already exists");
//   }

//   const hashedPassword = await bcrypt.hash(password, 10);

//   const user = await User.create({
//     name,
//     email,
//     password: hashedPassword
//   });

//   return {
//     id: user._id,
//     email: user.email,
//     role: user.role
//   };
// };

// export const loginUser = async ({ email, password }) => {
//   const user = await User.findOne({ email });
//   if (!user) {
//     throw new Error("Invalid credentials");
//   }

//   const isMatch = await bcrypt.compare(password, user.password);
//   if (!isMatch) {
//     throw new Error("Invalid credentials");
//   }

//   const token = jwt.sign(
//     { id: user._id, role: user.role },
//     process.env.JWT_SECRET,
//     { expiresIn: "1d" }
//   );

//   return { token };
// };
