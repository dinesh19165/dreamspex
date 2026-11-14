FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -Dmaven.test.skip=true package

FROM eclipse-temurin:21-jre
WORKDIR /app
ENV DREAMSPEX_HOMEPAGE_IMAGES_DIRECTORY=/var/lib/dream-spex/homepage-images
RUN useradd --system --uid 10001 --create-home appuser \
    && mkdir -p /var/lib/dream-spex/homepage-images \
    && chown -R 10001:10001 /var/lib/dream-spex
VOLUME ["/var/lib/dream-spex/homepage-images"]
COPY --from=build /workspace/target/dream-spex-api-0.1.0-SNAPSHOT.jar /app/app.jar
USER 10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
