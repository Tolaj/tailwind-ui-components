import User from "../models/user.model.js";

/* CREATE */
export const createUser = async (data) => {
    return await User.create(data);
};

/* READ */
export const getAllUsers = async () => {
    return await User.find();
};

export const getUserByEmail = async (email) => {
    return User.findOne({ email });
};

export const getUserById = async (id) => {
    return await User.findById(id);
};

/* UPDATE */
export const updateUser = async (id, data) => {
    return await User.findByIdAndUpdate(id, data, { new: true });
};

/* DELETE */
export const deleteUser = async (id) => {
    return await User.findByIdAndDelete(id);
};
