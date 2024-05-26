FROM node:20-alpine as builder-web

WORKDIR /app/build
COPY ./package.json ./package.json
RUN yarn --frozen-lockfile

COPY . .
RUN yarn build


FROM nginx:latest
COPY --from=builder-web /app/build/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
