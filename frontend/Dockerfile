FROM node:22-alpine AS build

WORKDIR /app

COPY package.json yarn.lock* /app/
RUN yarn install --frozen-lockfile --ignore-engines || yarn install --ignore-engines

COPY . /app

ARG REACT_APP_API_URL=http://localhost:8000
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

RUN yarn build

FROM nginx:1.27-alpine

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]