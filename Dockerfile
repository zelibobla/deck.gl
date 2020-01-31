FROM python:3.7-slim
RUN pip install --no-cache-dir notebook==5.*
RUN pip install pydeck
RUN jupyter nbextension install --sys-prefix --symlink --overwrite --py pydeck
RUN jupyter nbextension enable --sys-prefix --py pydeck

RUN pip install jupyter && \
  pip install jupyterlab && \
  pip install requests && \
  pip install pandas

ENV HOME=/tmp
ENV MAPBOX_API_KEY=pk.eyJ1IjoiZHViZXJzYWoiLCJhIjoiY2swcGw1ZmgxMGVqZzNjbnhzaWVxMHV0ZyJ9.p_3sGrPDq7v2Crb4cIfx3Q
WORKDIR ${HOME}
COPY ./bindings/pydeck/examples/ .

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
