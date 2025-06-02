FROM openjdk:21-jdk

WORKDIR /var/run

COPY paper-1.21.5-94.jar paper.jar

RUN java -jar paper.jar || true

COPY plugins plugins

COPY spawnworld spawnworld

COPY plugins-conf plugins

COPY server.properties .

COPY paper-global.yml config/

ENTRYPOINT [ "java", "-Dcom.mojang.eula.agree=true", "-jar", "paper.jar"]
