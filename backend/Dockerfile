# stage 1: build
FROM maven:3.9.4-eclipse-temurin-21 AS builder
WORKDIR /build
COPY . .
RUN mvn -B -DskipTests package

# stage 2: run
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
# copy jar (pick first jar/war that matches target/*.jar or *.war)
COPY --from=builder /build/target/*.jar /app/app.jar
# fallback if war: the plugin usually produces executable jar/war; ensure correct file in target
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
