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
**(Abass Makinde)** - <abass@blusalt.io>

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
	"email": "abass@blusalt.io",
	"password": "blusalt",
	"cPassword": "blusalt",
	"firstname": "newspaper",
    "lastname": "stand",
    "phoneNumber": "08066441262",
    "dob": "2019-12-04"
}
```

***sample response***

```json
{
    "error": false,
    "code": 201,
    "data": {
        "email": "abass@blusalt.io",
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
	"email": "abass@blusalt.io",
	"password": "blusalt"
}
```

***sample response***

```json
{
    "error": false,
    "code": 200,
    "data": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFiYXNzYWRlbWFrQGdtYWlsLmNvbSIsImlkIjoiNWVjN2IzY2ZmMzI2MTA0NzYxZjIzOWVmIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNTkwMTQ2MDIyLCJleHAiOjE1OTAzMTg4MjJ9.z8xh-kpybemNz9-HViefV3tfmpV7uQ7f0U1V0eguSkA",
    "message": "admin successfully logged in"
}
```

### More Info
For more description of this API, please contact the author of this code with the detail provided above