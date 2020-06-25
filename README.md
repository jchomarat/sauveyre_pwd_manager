# Sauveyre: KeePass DB viewer

## Run deno server locally on WSL

```sh
/> deno run --allow-env --allow-net --allow-read app.ts
```

## Build docker container

```sh
/> docker build . --build-arg ENV=prod|dev -t sharedcontainerreg.azurecr.io/sauveyre:X
```

## Run for dev (locally)

```sh
/> docker run -it --init --env PORT=80 -p 3000:80 sharedcontainerreg.azurecr.io/sauveyre:X
```

### Enter container

```sh
/> docker containe ps
# Get container ID
/> docker exec -it containerID sh # alpine no bash
```

## Run for prod (locally)

```sh
/> docker run -it --init --env PORT=80 -p 80:80 sharedcontainerreg.azurecr.io/sauveyre:X
```

## Push image to ACR

```sh
/>  docker push sharedcontainerreg.azurecr.io/sauveyre:X
```