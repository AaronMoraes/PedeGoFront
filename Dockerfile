FROM nginx:1.27-alpine

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY . /usr/share/nginx/html
RUN rm -rf /usr/share/nginx/html/nginx /usr/share/nginx/html/Dockerfile /usr/share/nginx/html/.dockerignore

# API_ORIGIN é obrigatório: docker run -e API_ORIGIN=https://api.seudominio.com.br ...
ENV API_ORIGIN=http://localhost:5000
EXPOSE 80
