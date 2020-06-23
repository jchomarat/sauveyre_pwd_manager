var Auth = {
  config: {
    auth: {
      clientId: undefined,
      authority: "https://login.microsoftonline.com/common",
      redirectUri: undefined,
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false
    }
  },
  mSALObj: undefined,
  loginRequest: {
    scopes: ["openid", "profile", "User.Read"]
  },
  oneDriveRequest: {
    scopes: ["Files.Read"]
  },
  account: undefined,
  init: async function() {
    const paramsResponse = await fetch('/config');
    const params = await paramsResponse.json();
    this.config.auth.clientId = params.clientId;
    this.config.auth.redirectUri = params.redirectUri;

    this.mSALObj = new Msal.UserAgentApplication(this.config);
        
  },
  signIn : async function() {
    if (this.mSALObj) {
      try {
        var loginResponse = await this.mSALObj.loginPopup(this.loginRequest);
        if (this.mSALObj.getAccount()) {
          this.account = this.mSALObj.getAccount();
          return {
            success: true,
          }
        }
      }
      catch(error) {
        return {
          success: false,
        }
      }
    }
  },
  userName: function() {
    if (this.account) {
      return this.account.userName;
    }
    else return undefined;
  },
  isAllowed: async function() {
    if (this.account) {
      const permissionResponse = await fetch(`/isAllowed/${this.account.userName}`);
      const permission = await permissionResponse.json();
      return permission;
    }
  },
  getToken: async function() {
    var tokenResponse = await this.mSALObj.acquireTokenPopup(this.oneDriveRequest);
    return tokenResponse.accessToken;
  },
  signOut: async function () {
    if (this.mSALObj) {
      await this.mSALObj.logout();
    }
  }
};
 
 
//  const msalConfig = {
//     auth: {
//       clientId: "9dc27ed4-fb1d-479f-84cc-2e211f82cc55",
//       authority: "https://login.microsoftonline.com/common",
//       redirectUri: "http://localhost:3000",
//     },
//     cache: {
//       cacheLocation: "sessionStorage", // This configures where your cache will be stored
//       storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
//     }
//   };  
    
//   // Add here scopes for id token to be used at MS Identity Platform endpoints.
//   const loginRequest = {
//     scopes: ["openid", "profile", "User.Read"]
//   };
  
//   // Add here scopes for access token to be used at MS Graph API endpoints.
//   const tokenRequest = {
//     scopes: ["Files.Read"]
//   };

// // Create the main myMSALObj instance
// // configuration parameters are located at authConfig.js
// const myMSALObj = new Msal.UserAgentApplication(msalConfig);

// function signIn() {
//   myMSALObj.loginPopup(loginRequest)
//     .then(loginResponse => {
      
//       if (myMSALObj.getAccount()) {
//         //showWelcomeMessage(myMSALObj.getAccount());
//         console.log(myMSALObj.getAccount())
//       }
//     }).catch((error) => {
//       console.log(error);
//     });
// }

// function signOut() {
//   myMSALObj.logout();
// }

// function getTokenPopup(request) {
//   return myMSALObj.acquireTokenSilent(request)
//     .catch(error => {
//       console.log(error);
//       console.log("silent token acquisition fails. acquiring token using popup");
          
//       // fallback to interaction when silent call fails
//         return myMSALObj.acquireTokenPopup(request)
//           .then(tokenResponse => {
//             return tokenResponse;
//           }).catch(error => {
//             console.log(error);
//           });
//     });
//}

// function seeProfile() {
//   if (myMSALObj.getAccount()) {
//     getTokenPopup(loginRequest)
//       .then(response => {
//         callMSGraph(graphConfig.graphMeEndpoint, response.accessToken, updateUI);
//         profileButton.classList.add("d-none");
//         mailButton.classList.remove("d-none");
//       }).catch(error => {
//         console.log(error);
//       });
//   }
// }

// function readMail() {
//   if (myMSALObj.getAccount()) {
//     getTokenPopup(tokenRequest)
//       .then(response => {
//         callMSGraph(graphConfig.graphMailEndpoint, response.accessToken, updateUI);
//       }).catch(error => {
//         console.log(error);
//       });
//   }
// }


// Create the main myMSALObj instance
// configuration parameters are located at authConfig.js
//const myMSALObj = new Msal.UserAgentApplication(msalConfig); 

// let accessToken;

// // Register Callbacks for Redirect flow
// myMSALObj.handleRedirectCallback(authRedirectCallBack);

// function authRedirectCallBack(error, response) {
//   if (error) {
//       console.log(error);
//   } else {
//       if (response.tokenType === "id_token") {
//           console.log("id_token acquired at: " + new Date().toString()); 
          
//           if (myMSALObj.getAccount()) {
//             console.log(myMSALObj.getAccount());
//           }

//       } else if (response.tokenType === "access_token") {
//         console.log("access_token acquired at: " + new Date().toString());
//         accessToken = response.accessToken;

//         try {
//           callMSGraph(graphConfig.graphMailEndpoint, accessToken, updateUI);
//         } catch(err) {
//           console.log(err)
//         } finally {
//           profileButton.classList.add('d-none');
//           mailButton.classList.remove('d-none');
//         }
//       } else {
//           console.log("token type is:" + response.tokenType);
//       }
//   }
// }

// if (myMSALObj.getAccount()) {
//   showWelcomeMessage(myMSALObj.getAccount());
// }

// function signIn() {
//   myMSALObj.loginRedirect(loginRequest);
// }

// function signOut() {
//   myMSALObj.logout();
// }