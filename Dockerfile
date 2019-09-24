FROM python:3.7-slim
RUN pip install --no-cache-dir notebook==5.*
RUN pip install pydeck

ENV HOME=/tmp
ENV MAPBOX_API_KEY=pk.eyJ1IjoiZHViZXJzYWoiLCJhIjoiY2swcGw1ZmgxMGVqZzNjbnhzaWVxMHV0ZyJ9.p_3sGrPDq7v2Crb4cIfx3Q
COPY . ${HOME}
WORKDIR ${HOME}/bindings/python/pydeck

RUN pip install -r requirements-dev.txt

ARG NB_USER=jovyan
ARG NB_UID=1000
ENV USER ${NB_USER}
ENV NB_UID ${NB_UID}
ENV HOME /home/${NB_USER}

RUN adduser --disabled-password \
    --gecos "Default user" \
    --uid ${NB_UID} \
    ${NB_USER}

USER root
RUN chown -R ${NB_UID} ${HOME}
USER ${NB_USER}
