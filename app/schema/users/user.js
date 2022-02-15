const Joi = require('@hapi/joi');

const firstname = Joi.string();
const lastname = Joi.string();
const phoneNumber = Joi.string();
const dob = Joi.date();
const status = Joi.boolean();
const email = Joi.string();
const password = Joi.string();
const cPassword = Joi.string();

module.exports = {
  signUpAdmin: Joi.object({
    firstname: firstname.required().min(3),
    lastname: lastname.required().min(3),
    phoneNumber: phoneNumber.required().min(10),
    dob: dob.required(),
    email: email.required(),
    password: password.required(),
    cPassword: cPassword.required(),
  }),

  signInAdmin: Joi.object({
    email: email.required(),
    password: password.required(),
  }),

  editAdmin: Joi.object({
    firstname,
    lastname,
    email,
    password,
    cPassword,
  }),

  adminAccountDeactivation: Joi.object({
    status: status.required(),
  }),

};
