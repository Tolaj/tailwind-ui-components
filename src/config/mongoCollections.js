// import { dbConnection } from "./mongoConnection.js";

// const getCollectionFn = (collection) => {
//     let _col = undefined;

//     return async () => {
//         if (!_col) {
//             const db = await dbConnection();
//             _col = await db.collection(collection);
//         }

//         return _col;
//     };
// };

// export const questions = getCollectionFn("questions");
// export const users = getCollectionFn("users");
// export const courses = getCollectionFn("courses");
// export const answers = getCollectionFn("answers");
// export const sessions = getCollectionFn("sessions");
