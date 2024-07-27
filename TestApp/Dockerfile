FROM python:3.12-slim
# FROM python:3.12-alpine

WORKDIR /app

COPY requirements.txt .

RUN pip3 install -r /app/requirements.txt

COPY . .
RUN chmod +x start.sh
RUN pwd && ls -al

EXPOSE 8000

# CMD ["python", "-u", "manage.py", "runserver", "0.0.0.0:8000"]
ENTRYPOINT ["/bin/bash", "/app/start.sh"]
