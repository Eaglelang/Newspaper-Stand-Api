function emailTemp(message) {
  return `<html>
    <head>
    <meta charset="UTF-8">
    <link href='http://fonts.googleapis.com/css?family=Open+Sans:400,300' rel='stylesheet' type='text/css'>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <style>
        *{
            box-sizing: border-box;
            -moz-box-sizing: border-box;
        }
        .social-icons {
            list-style-type: none;
            display: grid;
            grid-template-columns: 10% auto;
        }
        .social-icons li{
            margin-bottom: 15px;
        }
        .social-icons li a{
            color: white;
        }
        a{
            text-decoration:none;
        }
        html,body{
            background: #eeeeee;
            font-family: 'Open Sans', sans-serif, Helvetica, Arial;
        }
        /* This is what it makes reponsive. Double check before you use it! */
        @media only screen and (max-width: 480px){
            table tr td{
                width: 100% !important;
                float: left;
            }
        }
    </style>
    </head>
    
    <body style="background: #eeeeee; padding: 10px; font-family: 'Open Sans', sans-serif, Helvetica, Arial;">
    
    <table width="100%" cellpadding="0" cellspacing="0" bgcolor="FFFFFF" style="background: #ffffff; max-width: 600px !important; margin: 0 auto; background: #ffffff;">
        <tr>
            <td style="padding: 0px; background: #f9f9f9;">
                <center> 
                <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td width="30%" style="width: 30%; padding: 0px; text-align: center; background: #f9f9f9;">
                            <img src="https://tnspublic.s3.us-east-2.amazonaws.com/tns_logo.png" alt="TNS Logo" width="190" height="140"/>
                        </td>
                        <td width="70%" style="width: 70%; padding-left: 10px; text-align: center; background: #f9f9f9;">
                            <h1 style="color: #000000">${message.subject}</h1>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    
        <tr>
            <td style="padding: 20px; text-align: left;">
                <p>${message.body}</p>
            </td>
        </tr>
    
        <tr>
            <td style="padding: 20px; background: #f9f9f9;">
                <table border="0" cellpadding="0">
                    <tr>
                        <td width="30%" style="width: 30%; padding: 10px;">
                            <img src="https://thenewspaperstand.com.ng/wp-content/uploads/2020/06/TNS-phone3-min-1.png" alt="TNS Logo" width="190" height="140">
                        </td>
                        <td width="70%" style="width: 70%; padding: 10px; text-align: left;">
                            <h3>Your favourite Newspaper & magazines on the go</h3>
                            <p>Get digital replicas of your favorite newspapers and magazines at the fraction of the cost</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    
    
        <tr>
            <td style="padding: 10px; background: #ee7f0d;">
                    <table border="0" cellpadding="0" cellspacing="0">
                    <tr>
                        <td width="40%" style="width: 40%; padding: 10px; color: #ece8e8; text-align: center;" valign="top">
                              <div class="social-container">
                                <ul class="social-icons">
                                    <li><a href="#"><i class="fa fa-instagram fa-2x"></i></a></li>
                                    <li><a href="#"><i class="fa fa-twitter fa-2x"></i></a></li>
                                    <li><a href="#"><i class="fa fa-linkedin fa-2x"></i></a></li>
                                    <li><a href="#"><i class="fa fa-facebook fa-2x"></i></a></li>
                                </ul>
                            </div>
                        </td>
                        <td width="60%" style="width: 60%; padding: 10px; color: #ece8e8; text-align: left;" valign="top">
                            <h2>Contact us</h2>
                            <table border="0" style="font-size: 14px; color: #ece8e8;">
                                <tr><td>Phone: 08109550955</td></tr>
                                <tr><td>website: <a href="https://thenewspaperstand.com" style="color:#ece8e8;">https://thenewspaperstand.com</a></td></tr>
                            </table>
                        </td>
                    </tr>
                </table>
    
            </td>
        </tr>
    </table>
    
    
    <p style="text-align: center; color: #666666; font-size: 12px; margin: 10px 0;">
        Copyright © ${new Date().getFullYear()}. All&nbsp;rights&nbsp;reserved.<br />
    </p>
    
    </center>
    
    </body>
    </html>`;
}

module.exports = emailTemp;
