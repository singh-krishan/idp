import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
public class CamelRoutesTest {

    @Test
    public void testRootEndpoint() {
        given()
            .when().get("/")
            .then()
                .statusCode(200)
                .body("message", containsString("{{ cookiecutter.project_name }}"))
                .body("version", equalTo("0.1.0"));
    }

    @Test
    public void testHealthEndpoint() {
        given()
            .when().get("/health")
            .then()
                .statusCode(200)
                .body("status", equalTo("healthy"))
                .body("service", equalTo("{{ cookiecutter.project_name }}"));
    }

    @Test
    public void testHelloEndpoint() {
        given()
            .when().get("/hello")
            .then()
                .statusCode(200)
                .body("message", containsString("hello"));
    }

    @Test
    public void testQuarkusHealthEndpoint() {
        given()
            .when().get("/q/health")
            .then()
                .statusCode(200)
                .body("status", equalTo("UP"));
    }

    @Test
    public void testMetricsEndpoint() {
        given()
            .when().get("/q/metrics")
            .then()
                .statusCode(200)
                .body(containsString("http_server"));
    }
}
