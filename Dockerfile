FROM hayd/alpine-deno:1.1.1

EXPOSE 80

ARG ENV

WORKDIR /app

# Cache the dependencies as a layer (the following two steps are re-run only when deps.ts is modified).
# Ideally fetch deps.ts will download and compile _all_ external files used in main.ts.
COPY deps.ts .
RUN deno cache deps.ts

# These steps will be re-run upon each file change in your working directory:
ADD app.ts .
ADD controller.ts .
ADD routes.ts .
ADD .env-prod .env-prod
ADD .env .env-dev 
ADD www/ www/

# handle .env file based on ENV => if prod, then take env-prod (to build the image to deploy), or debug
# adapat accordingly both files .env & .env-prod locally on your machine
RUN if [ "$ENV" = "prod" ] ; then mv .env-prod .env ; fi
RUN if [ "$ENV" = "dev" ] ; then mv .env-dev .env ; fi

# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache app.ts

CMD ["run", "--allow-net", "--allow-env", "--allow-read", "app.ts"]