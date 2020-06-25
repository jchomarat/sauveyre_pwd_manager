const getConfig = async (context: any) => { 
  context.response.body = {
    clientId: Deno.env.get('oauthClientId'),
    redirectUri: Deno.env.get('oauthRedirectUri')
  };
};

const isAllowed = async (context: any) => { 
  if (context.params && context.params.user) {
    var allowedList = Deno.env.get('allowed')?.split(',');
    if (allowedList && allowedList.length > 0) {
      const found = allowedList.find(element => element == context.params.user);
      if (found) {
        context.response.body = {
          isAllowed: true
        };
        return;
      }
    }
  }
  context.response.body = {
    isAllowed: false
  };
};

const getDBPath = async (context: any) => {
  var dbPath = Deno.env.get('dbPath');
  context.response.body = {
    dbPath: dbPath
  };
};

export { getConfig, isAllowed, getDBPath }