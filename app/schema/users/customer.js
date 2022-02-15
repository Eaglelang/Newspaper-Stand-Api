const Joi = require('@hapi/joi');

const firstname = Joi.string();
const lastname = Joi.string();
const phoneNumber = Joi.string();
const dob = Joi.date();
const email = Joi.string();
const password = Joi.string();
const country = Joi.string();
const role = Joi.string();
const cacNumber = Joi.string();
const companyName = Joi.string();
const companyAddress = Joi.string();
const companyPhoneNumber = Joi.string();
const companyEmail = Joi.string();

module.exports = {
  creatNewCustomer: Joi.object({
    firstname: firstname.required().min(3),
    lastname: lastname.required().min(3),
    phoneNumber: phoneNumber.required().min(10),
    dob: dob.required(),
    email: email.required(),
    password: password.required(),
    country: country.required(),
    role: role.required(),
    cacNumber: cacNumber.required(),
    companyName: companyName.required(),
    companyAddress: companyAddress.required(),
    companyPhoneNumber: companyPhoneNumber.required(),
    companyEmail: companyEmail.required(),
  }),

  signInCustomer: Joi.object({
    email: email.required(),
    password: password.required(),
  }),

  editCustomer: Joi.object({
    firstname,
    lastname,
    email,
    password,
    country,
  }),

};
