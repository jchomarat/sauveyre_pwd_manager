class Layout {
    
    app = undefined;
    pwd = undefined;
    content = undefined;
    tree = undefined;
    searchEntries = undefined;
    entryPanel = undefined;

    constructor() {

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
                        <div id="entry" class="col pl-3"></div>
                    `;
                }
            }
        });

        this.tree = new Reef('#tree', {
            data: {
                rootGroup: undefined,
                selectedItemId: undefined
            },
            template: (props) => {
                // Build the tree
                var index = 1;
                const buildTree = (parent) => {
                    // show only if parent has entries to be shwon or children
                    if ((parent.children && parent.children.length > 0) || (parent.entries && parent.entries.find(e => e.hidden == false))) {
                        return `
                            <li>
                                <span class='caret caret-down'><b>${parent.name}</b></span>
                                <ul class='nested active'>
                                    ${parent.children.map((child) => {
                                        return `
                                            ${buildTree(child)}
                                        `;
                                    }).join('')}

                                    ${parent.entries.map((entry) => {
                                        if (!entry.hidden) {
                                            return `
                                                <li 
                                                    class="treeEntry ${props.selectedItemId && props.selectedItemId === entry.id ? "itemselected" : ""}" 
                                                    data-id="${entry.id}" data-index="${index++}">
                                                ${entry.title}</li>
                                            `;
                                        }
                                    }).join('')}
                                </ul>
                            </li>
                        `;
                    }
                    else return '';
                }
                return `
                    <div id="search"></div>
                    <ul>
                        ${buildTree(props.rootGroup)}
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
                    <form>
                        <div class="form-group">
                            <label for="entryTitle">Title</label>
                            <input type="text" class="form-control" name="entryTitle" id="entryTitle" value="${props.entry ? props.entry.title : ""}"></input>
                        </div>

                        <div class="form-group">
                            <label for="entryUrl">Url</label>
                            <div class="input-group">
                                <input type="text" class="form-control" name="entryUrl" id="entryUrl" value="${props.entry ? (props.entry.url === "" ? " " : props.entry.url) : ""}"></input>
                                <div class="copy-value align-middle pt-1" data-for="entryUrl" style="cursor: pointer;">&#128458</div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="entryUsername">User name</label>
                            <div class="input-group">
                                <input type="text" class="form-control" name="entryUsername" id="entryUsername" value="${props.entry ? props.entry.userName : ""}"></input>
                                <div class="copy-value align-middle pt-1" data-for="entryUsername" style="cursor: pointer;">&#128458</div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="entryPassword">Password</label>
                            <div class="input-group">
                                <input type="password" class="form-control" name="entryPassword" id="entryPassword" value="${props.entry ? props.entry.hashedPassword : ""}"></input>
                                <div class="view-value align-middle pt-1" data-for="entryPassword" style="cursor: pointer;">&#128065</div>
                                <div class="copy-value align-middle pt-1" data-for="entryPassword" style="cursor: pointer;">&#128458</div>
                            </div>
                        </div>

                        <div class="form-group">
                            <label for="entryNotes">Notes</label>
                            <textarea name="entryNotes" class="form-control" row="10">
                                ${props.entry ? props.entry.notes : ""}  
                            </textarea>
                        </div
                    </form>
                `;
            }
        });        
    }

    select(entryId) {
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
}