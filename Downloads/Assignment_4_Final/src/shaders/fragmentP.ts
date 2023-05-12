export const fragmentPhongShaderSrc = 
    `varying vec3 normalInterp;  // Surface normal
    varying vec3 vertPos;       // Vertex position
    float Ka = 0.02;   // Ambient reflection coefficient
    uniform float Kd;   // Diffuse reflection coefficient
    uniform float Ks;   // Specular reflection coefficient
    float shininessVal = 20.0; // Shininess
    // Material color
    vec3 ambientColor = vec3(1.0, 1.0, 1.0);
    vec3 diffuseColor = vec3(1.0, 1.0, 0.0);
    vec3 specularColor = vec3(1.0, 1.0, 1.0);
    vec3 lightPos = vec3(-12, 40, -3); // Light position
    vec3 uColor = vec3(1.0, 1.0, 0.0);

    void main() {
        vec3 N = normalize(normalInterp);
        vec3 L = normalize(lightPos - vertPos);

        // Lambert's cosine law
        float lambertian = max(dot(N, L), 0.0);
        float specular = 0.0;
        if(lambertian > 0.0) {
            vec3 R = reflect(-L, N);      // Reflected light vector
            vec3 V = normalize(-vertPos); // Vector to viewer
            // Compute the specular term
            float specAngle = max(dot(R, V), 0.0);
            specular = pow(specAngle, shininessVal);
        }
        gl_FragColor = vec4(0.2 * uColor + 
                            Ka * ambientColor +
                            Kd * lambertian * diffuseColor +
                            Ks * specular * specularColor, 1.0);
    }`