FROM node:16-alpine as base
ENV NODE_ENV="production"


# Install all node_modules, including dev dependencies
FROM base as deps

WORKDIR /jefb

ADD package.json yarn.lock .yarnrc.yml ./
ADD .yarn .yarn

RUN yarn install --immutable

# Setup production node_modules
FROM base as production-deps

WORKDIR /jefb

COPY --from=deps /jefb/node_modules /jefb/node_modules
COPY --from=deps /jefb/.yarn /jefb/.yarn
COPY --from=deps /jefb/.yarnrc.yml /jefb/.yarnrc.yml
ADD package.json yarn.lock ./

RUN yarn workspaces focus --production
# ensure cache is not copied into final image
RUN rm -rf .yarn/cache

# Build the app
FROM base as build

ARG NODE_ENV="production"
ENV NODE_ENV=$NODE_ENV

WORKDIR /jefb

COPY --from=deps /jefb/node_modules node_modules
COPY --from=deps /jefb/.yarn .yarn
COPY --from=deps /jefb/.yarnrc.yml .yarnrc.yml

ADD . .
RUN yarn build

# Finally, build the production image with minimal footprint
FROM base as prod

ENV PORT="8080"

WORKDIR /jefb

COPY --from=production-deps /jefb/node_modules node_modules
COPY --from=production-deps /jefb/.yarn .yarn
COPY --from=production-deps /jefb/.yarnrc.yml .yarnrc.yml
COPY --from=build /jefb/build /jefb/build
COPY --from=build /jefb/public /jefb/public
COPY remix.config.js package.json yarn.lock ./

CMD ["yarn", "start"]
