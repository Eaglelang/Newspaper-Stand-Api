## Newspaper stand backend

### description
backend service for newspaper stand

## Installation

Ensure you have the below required softwares installed before you clone this repo

- **Node** version >= 12.0.0
- **npm** version >= 6.13.4
- **mongodb**
---

## Configuration
After a successful installation of the above stated softwares, copy the below command to your terminal to clone the project 

```bash
git clone sosos.git
```
After cloning the project, run the command below to install all the required node modules.

```bash
npm install
```
---
## Author
Taiwo Ademola

---

## Operating instruction
- Dont't forget to create a `.env` file, update it with the content of `sample.env` file in the project directory.
- To start this software, run the first command below to get the code running at development level
- And to run the test, run the second command below. Jest and Supertest are used

```bash
npm start
```

```bash
npm test
```

### User Routes (They are all HTTP)

Name                                         | Endpoint
------------------------------------------- | -------------------------------------------
(**POST**) Sign up request                             | /v1/user/signup
(**POST**) Sign in request                             | /v1/user/signin

**Sign up request**

#### Note
The first sign up should be the super admin, as their can only be a super admin. And to create the super access

Sample subscription call - ```localhost:8080/v1/user/signup```

***sample request***

```json
{
	"email": "taiwoademola25@gmail.com",
	"password": "coolplace",
	"cPassword": "coolplace",
	"firstname": "coolplace",
    "lastname": "news",
    "phoneNumber": "08084839131",
    "dob": "20212-12-05"
}
```

***sample response***

```json
{
    "error": false,
    "code": 201,
    "data": {
        "email": "taiwoademola25@gmail.com",
        "role": "admin"
    },
    "message": "successfully created a new admin"
}
```


**Sign in request**

User can sign in to have access to some authenticated endpoints
sample call - ```localhost:8080/v1/user/signin```

***sample request***

```json
{
	"email" :"taiwoademola25@gmail.com",
	"password": "eagle"
}
```

