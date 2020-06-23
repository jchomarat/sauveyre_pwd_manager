var Kdbx = {
    endPoint: "https://graph.microsoft.com/v1.0/me/drive/root:",
    kdbxDB: undefined,
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

        var entryId = 0;

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

            return buildTree(this.kdbxDB.getDefaultGroup());

        }
        catch(error) {
            console.log('Could not open DB')
            return undefined;
        }
    },
    decryptPwd: function (entryUUID) {
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
    }
};