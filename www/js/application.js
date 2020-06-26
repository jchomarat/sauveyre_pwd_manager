var Authentication = {
    // Config used to set up OAuth. Both clientId & redirectUri are stored in the server .env file, and retreived 
    // by calling /config
    config: {
        auth: {
            clientId: undefined,
            redirectUri: undefined,
        },
        cache: {
            cacheLocation: "localStorage",
            storeAuthStateInCookie: false
        }
    },

    mSALObj: undefined,

    // Permissions requet to login
    loginRequest: {
        scopes: ["openid", "profile", "User.Read"],
        forceRefresh: false
    },

    // Permissions request to read files on the user OneDrive
    oneDriveRequest: {
        scopes: ["Files.Read"]
    },

    // Will store the signedIn user account
    account: undefined,

    // Initialize the connexion, retrieve settings from the back end
    init: async function() {
        const paramsResponse = await fetch('/config');
        const params = await paramsResponse.json();
        this.config.auth.clientId = params.clientId;
        this.config.auth.redirectUri = params.redirectUri;

        this.mSALObj = new Msal.UserAgentApplication(this.config);

        // Check if this is the call back after login
        if (this.mSALObj.getAccount() && !this.mSALObj.isCallback(window.location.hash)) {
            // User loggedin, nothing to do
            this.account = this.mSALObj.getAccount();
        }
    },

    isLoggedIn: function() {
        return (this.account !== undefined);
    },

    // Trigger the sign in process
    signIn: async function() {
        if (this.mSALObj) {
            this.mSALObj.loginRedirect(this.loginRequest);
        }
    },

    // Retreive the signed in user's username
    userName: function() {
        if (this.account)
            return this.account.userName;
        else
            return undefined;
    },

    // Validate if the signed in user is allowed. For now, this permission system is pretty basic, allowed user(s) are 
    // stored in the .env file on the back end
    isAllowed: async function() {
        if (this.account) {
            const permissionResponse = await fetch(`/isAllowed/${this.account.userName}`);
            const permission = await permissionResponse.json();
            return permission;
        }
    },

    // Generate a token in order to read files from OneDrive
    getToken: async function() {
        var tokenResponse = await this.mSALObj.acquireTokenSilent(this.oneDriveRequest);
        return tokenResponse.accessToken;
    },

    // Sign out the user
    signOut: async function() {
        if (this.mSALObj) {
            await this.mSALObj.logout();
        }
    }
};

/*
    Wrapper to interact with the lib kdbxweb (https://github.com/keeweb/kdbxweb)
*/
var Kdbx = {
    
    endPoint: "https://graph.microsoft.com/v1.0/me/drive/root:",
    
    // Will store the actual DB in memory (crypted)
    kdbxDB:  undefined,
    
    // Load the DB. This method does actually 2 things: get the 'blob' from OneDrive, and unlock the DB using the provided password
    load: async function(token, dbpassword) {
        // Get dnb path
        const dbPathResponse = await fetch('/dbpath');
        const dbPath = (await dbPathResponse.json()).dbPath;
        
        // Get file from OneDrive
        const headers = new Headers();
        const bearer = `Bearer ${token}`;

        headers.append("Authorization", bearer);

        const options = {
            method: "GET",
            headers: headers
        };
  
        try {
            var dbResponse = await fetch(`${this.endPoint}${dbPath}:/content`, options);
            var dbBuf = await dbResponse.arrayBuffer();
        }
        catch(error) {
            console.log('Could not retrieve db from OneDrive')
            return undefined;
        }

        var entryId = 1;

        try {
            const pass = kdbxweb.ProtectedValue.fromString(dbpassword);
            const credentials = new kdbxweb.Credentials(pass);
            this.kdbxDB = await kdbxweb.Kdbx.load(dbBuf, credentials);

            const buildTree = (parent) => {
                var child = {};
                child.name = parent.name;
                if (parent.groups && parent.groups.length > 0) {
                    child.children = parent.groups.map((group) => {
                        return buildTree(group);
                    });
                } else child.children = [];
                if (parent.entries && parent.entries.length > 0) {
                    child.entries = parent.entries.map((entry) => {
                        return {
                            id: entryId++,
                            title: entry.fields.Title,
                            url: entry.fields.URL,
                            userName: entry.fields.UserName,
                            hashedPassword: entry.uuid.id,
                            notes: entry.fields.Notes,
                            hidden: false
                        };
                    });
                }  else child.entries = [];
                return child;
            }

            // The json behind 'getDefaultGroup' is complex, buildtree will just expose what we need to the UI
            return buildTree(this.kdbxDB.getDefaultGroup());

        }
        catch(error) {
            console.log('Could not open DB')
            return undefined;
        }
    },

    // Decrypt a hashed password once requested by the UI
    decryptPwd: function(entryUUID) {
        // Find entry in DB kept in memory
        const search = (group, uuid) => {
            for (const entry of group.entries) {
                if (entry.uuid.id === uuid) {
                    return entry.fields.Password;
                }
            }                  

            for (const subgroup of group.groups) {
                const res = search(subgroup, uuid);

                if (res) {
                    return res;
                }
            }
        };
        var hashedPwd = search(this.kdbxDB.getDefaultGroup(), entryUUID);
        let value = new kdbxweb.ProtectedValue(hashedPwd._value, hashedPwd._salt);
        return value.getText();
    },
};

/*
    This class builds the entire UI using Reef.js (https://reefjs.com/)
*/
var Application = {

    app: undefined,

    pwd: undefined,

    content: undefined,

    tree: undefined,

    searchEntries: undefined,

    entryPanel: undefined,

    init: function() {

        this.app = new Reef('#app', {
            data: {
                isSignedIn: false,
                userName: undefined
            },
            template: (props) => {
                return `
                    <div class="row p-2 bg-secondary text-white">
                        <div class="d-inline w-50">
                            <img src='img/logo.png' style='height: 30px' title='author freepik' /> <span class="badge badge-info">Sauveyre (v1.0)</span> KeePass database viewer
                        </div>
                        <div class="d-inline w-50 text-right">
                            <a href="#" id="signIn" class="text-white" style='display: ${props.isSignedIn ? 'none' : 'block'}'>Sign in</a>
                            <span style='display: ${props.isSignedIn ? 'block' : 'none'}'>
                                <span id="signedInUsername">${props.userName}</span> | 
                                <a href="#" class="text-white" id="signOut">Sign out</a>
                            </span>
                        </div>
                    </div>

                    <div id='dbpass' class="row m-2"></div>

                    <div id='content' class="row m-3"></div>
                `;
            }
        });

        this.pwd = new Reef('#dbpass', {
            data: {
                error: undefined
            },
            template: (props) => {
                return `
                    <div class="form-horizontal">
                        <div class="form-group">
                            <label for="dbpassword">Database password</label>
                            <input type='password' class="form-control" id='dbpassword' value=""></input>    
                            <small id="passwordError" class="form-text">${props.error ? props.error : ""}</small>                        
                        </div>
                        <button type="button" id='loadDB' class="btn btn-secondary">Load</button>
                    </div>
                `;
            }
        });

        this.content = new Reef('#content', {
            data: {
                isLoading: false
            },
            template: (props) => {
                if (props.isLoading) {
                    return `<div class="w-100 text-center"><img src='img/loading.gif'></img></div>`;
                }
                else {
                    return `
                        <div id="tree" class="col pl-3"></div>
                        <div id="entry" class="col pl-3 is-hidden"></div>
                    `;
                }
            }
        });

        this.tree = new Reef('#tree', {
            data: {
                rootGroup: undefined,
                selectedItemId: -1
            },
            template: (props) => {
                // Build the tree
                var index = 1;
                const flattenTree = (parent, levels) => {
                    // show only if parent has entries to be shwon or children
                    if ((parent.children && parent.children.length > 0) || (parent.entries && parent.entries.find(e => e.hidden == false))) {
                        return `
                            ${parent.children.map((child) => {
                                levels.push(child.name);
                                return `
                                    ${flattenTree(child, levels)}
                                `;
                            }).join('')}

                            ${parent.entries.map((entry) => {
                                if (!entry.hidden) {
                                    return `
                                        <li 
                                            class="treeEntry ${props.selectedItemId === entry.id ? "itemselected" : ""}" 
                                            data-id="${entry.id}" data-index="${index++}">${levels.join('/')}/${entry.title}</li>
                                    `;
                                }
                            }).join('')}
                        `;  
                    }
                    else return '';
                }
                return `
                    <div id="search"></div>
                    <ul class="mt-3">
                        ${props.rootGroup.children.map((child) => {
                            return `
                                ${flattenTree(child, [child.name])}
                            `;
                        }).join('')}
                    </ul>                    
                `;
            }
        });

        this.searchEntries = new Reef('#search', {
            template: (props) => {
                return `
                    <input type='text' class="form-control form-control-sm" id='searchKeyword' placeholder="Search ..."></input>              
                `;
            }
        })

        this.entryPanel = new Reef('#entry', {
            data: {
                entry: undefined
            },
            template: (props) => {
                return `
                    <div class="d-block">
                        <img src="./img/arrow-back.png" id="goBack" style="height: 15px" />
                    </div>
                    <div class="d-block">
                        <form>
                            <div class="form-group">
                                <label for="entryTitle">Title</label>
                                <input type="text" readonly class="form-control" name="entryTitle" id="entryTitle" ${props.entry ? `value="${props.entry.title}"` : ""}></input>
                            </div>

                            <div class="form-group">
                                <label for="entryUrl">Url</label>
                                <div class="input-group">
                                    <input type="text" readonly class="form-control" name="entryUrl" id="entryUrl" ${props.entry ? (props.entry.url === `value=" "` ? " " : `value="${props.entry.url}"`) : ""}></input>
                                    <div class="input-group-prepend copy-value" data-for="entryUrl"></div>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="entryUsername">User name</label>
                                <div class="input-group">
                                    <input type="text" readonly class="form-control" name="entryUsername" id="entryUsername" ${props.entry ? `value="${props.entry.userName}"` : ""}></input>
                                    <div class="input-group-prepend copy-value" data-for="entryUsername"></div>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="entryPassword">Password</label>
                                <div class="input-group">
                                    <input type="password" readonly class="form-control" name="entryPassword" id="entryPassword" ${props.entry ? `value="${props.entry.hashedPassword}"` : ""}></input>
                                    <div class="input-group-prepend copy-value" data-for="entryPassword"></div>
                                    <div class="input-group-prepend view-value" data-for="entryPassword"></div>
                                </div>
                            </div>

                            <div class="form-group">
                                <label for="entryNotes">Notes</label>
                                <textarea name="entryNotes" class="form-control" row="10" readonly>
                                    ${props.entry ? props.entry.notes : ""}  
                                </textarea>
                            </div
                        </form>
                    </div>
                `;
            }
        });        
    },

    // Select an item in the TreeView
    select: function(entryId) {
        const search = (tree, target) => {
            for (const entry of tree.entries) {
                if (entry.id === target) {
                    return entry;
                }
            }                  

            for (const child of tree.children) {
                const res = search(child, target);

                if (res) {
                    return res;
                }
            }
        };

        var entry = search(this.tree.data.rootGroup, entryId);
        if (entry) {
            this.tree.data.selectedItemId = entry.id;
            this.entryPanel.data = {
                entry: entry
            };
        }
    }
};