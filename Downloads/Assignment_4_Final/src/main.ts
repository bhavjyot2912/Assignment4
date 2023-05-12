import * as THREE from 'three'
import WebGL from 'three/addons/capabilities/WebGL.js'
import {vertexPhongShaderSrc} from './shaders/vertexP.ts'
import {fragmentPhongShaderSrc} from './shaders/fragmentP.ts'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css'

// Setting up scene

const scene = new THREE.Scene();
const button = document.getElementById('btn');
const changeCamera = document.getElementById('cbtn');
var enableBox = false;
var enableCamera = false;
button?.addEventListener('click', () => {
    enableBox = !enableBox;
})
changeCamera?.addEventListener('click', () => {
    enableCamera = !enableCamera;
})
var angle = 0.0;
document.addEventListener('keypress', (event) => {
    var name = event.key;
    var code = event.code;
    if(name == '[') {
        angle += 0.1;
    }
    if(name == ']') {
        angle -= 0.1;
    }
})

// Setting up camera and Renderer
// ************************
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 1, 500);
const cameraPers = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 2, 150);
const cmaeraHelper = new THREE.CameraHelper(cameraPers)
scene.add(cmaeraHelper);
camera.position.set(0, -5, 20);
camera.lookAt(0, -10, 0);

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
// renderer.shadowMap.type = THREE.PCFShadowMap;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
// ************************

// Making the ball
class Pendulum {
    ballGeometry: THREE.SphereGeometry
    ballMaterial: THREE.ShaderMaterial
    ball: THREE.Mesh
    lineGeometry: THREE.BufferGeometry
    lineMaterial: THREE.LineBasicMaterial
    line: THREE.Line
    acceleartion = 10
    length: number
    pivot: THREE.Vector2
    time: number
    bbox: THREE.Box3
    helper: THREE.Box3Helper
    theta: (time: number) => number
    omega: (time: number) => number

    constructor(scene: THREE.Scene, radius: number, pivot: THREE.Vector2, length: number, initialAngle: number, initialSpeed: number) {
        // Initial Speed
        this.length = length;
        this.pivot = pivot
        this.time = 0      

        // Calculates the angle
        this.theta = (time: number) => {
            const OMEGA = Math.sqrt(9.8 / this.length);
            const A = initialAngle;
            const B = initialSpeed / OMEGA;
            return A * Math.cos(OMEGA * time) + B * Math.sin(OMEGA * time)
        } 
        this.omega = (time: number) => {
            const OMEGA = Math.sqrt(9.8 / this.length);
            const A = initialAngle;
            const B = initialSpeed / OMEGA;
            return OMEGA * ( -A * Math.sin(OMEGA * time) + B * Math.cos(OMEGA * time))
        }
        // Creates the rope
        const curve = new THREE.SplineCurve([
            pivot,
            new THREE.Vector2(pivot.x, pivot.y - length),
        ]);
        const points = curve.getPoints(100);
        this.lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        this.lineMaterial = new THREE.LineBasicMaterial({color: 0x0000ff})
        this.line = new THREE.Line(this.lineGeometry, this.lineMaterial);
        scene.add(this.line);
        
        // Creates the ball
        this.ballGeometry = new THREE.SphereGeometry(radius, 32, 16);
        // this.ballMaterial = new THREE.MeshPhongMaterial({color:0xffff00});
        this.ballMaterial = new THREE.ShaderMaterial({
			vertexShader: vertexPhongShaderSrc,
			fragmentShader: fragmentPhongShaderSrc,
			wireframe: false,
			uniforms: {
                Kd: {value: 0.5},
                Ks: {value: 0.5}
            },
		});
        this.ball = new THREE.Mesh(this.ballGeometry, this.ballMaterial);
        this.ball.castShadow = true;
        scene.add(this.ball);


        /****************************
        * Frame Code 
        */
        const topBarGeometry = new THREE.BoxGeometry(4, 1, 1);
        const topBarMaterial = new THREE.MeshStandardMaterial({color:0xffffff});
        const topBar = new THREE.Mesh(topBarGeometry, topBarMaterial);
        topBar.position.set(pivot.x, pivot.y, 0);
        scene.add(topBar);

        const sideBar1Geometry = new THREE.BoxGeometry(1, this.length + radius * 2, 0.4);
        const sideBar1Material = new THREE.MeshStandardMaterial({color:0xffffff});
        const sideBar1 = new THREE.Mesh(sideBar1Geometry, sideBar1Material);
        sideBar1.position.set(pivot.x, pivot.y - (this.length + radius * 2)/2+1, 2.2);
        scene.add(sideBar1);

        const horiGeometry = new THREE.BoxGeometry(1,1, 2.2);
        const horiMaterial = new THREE.MeshStandardMaterial({color:0xffffff});
        const horiBar1 = new THREE.Mesh(horiGeometry, horiMaterial);
        horiBar1.position.set(pivot.x, pivot.y, 1.2);
        scene.add(horiBar1);

        this.ball.translateX(this.pivot.x + this.length * Math.sin(this.theta(this.time)))
        this.ball.translateY(this.pivot.y - this.length * Math.cos(this.theta(this.time)))
        this.ball.position.y = pivot.y - length;
        this.bbox = new THREE.Box3().setFromObject(this.ball);
        this.helper = new THREE.Box3Helper(this.bbox, new THREE.Color(0xffff00));
        scene.add(this.helper)
    }

    resetPosition(initialAngle: number, initialSpeed: number) {
        this.time = 0;
        this.theta = (time: number) => {
            const OMEGA = Math.sqrt(9.8 / this.length);
            const A = initialAngle;
            const B = initialSpeed / OMEGA;
            return A * Math.cos(OMEGA * time) + B * Math.sin(OMEGA * time)
        } 
        this.omega = (time: number) => {
            const OMEGA = Math.sqrt(9.8 / this.length);
            const A = initialAngle;
            const B = initialSpeed / OMEGA;
            return OMEGA * ( -A * Math.sin(OMEGA * time) + B * Math.cos(OMEGA * time))
        }
        // this.ball.translateX(this.pivot.x + this.length * Math.sin(this.theta(this.time)))
        // this.ball.translateY(this.pivot.y - this.length * Math.cos(this.theta(this.time)))
    }

    checkCollision(pendulum: Pendulum, sl: THREE.SpotLight) {
        if(this.bbox.intersectsBox(pendulum.bbox)) {
            pendulum.helper.material.color = new THREE.Color(0xffffff)
            const speed = this.omega(this.time);
            if(speed != 0) {
                sl.position.set(pendulum.pivot.x, pendulum.pivot.y, 5)
                sl.target = pendulum.ball;
                // camera2.position.set(pendulum.ball.position.x, pendulum.ball.position.y, 5);
                this.resetPosition(0, 0);
                pendulum.resetPosition(0, speed)
            } else {
                const speed = pendulum.omega(pendulum.time);
                sl.position.set(this.pivot.x, this.pivot.y, 5)
                sl.target = this.ball;
                // camera2.position.set(this.ball.position.x, this.ball.position.y, 5);
                this.resetPosition(0, speed);
                pendulum.resetPosition(0, 0)
            }
        }else {
            pendulum.helper.material.color = new THREE.Color(0xffff00)
        }
    }

    collisionWithBall(ball: THREE.Mesh, box: THREE.Box3, sphereSpeed: number, sl: THREE.SpotLight) {
        if(this.bbox.intersectsBox(box)) {
            const speed = this.omega(this.time);
            if(speed != 0) {
                this.resetPosition(0,0);
                ball.translateX(1);
                sl.target = ball;
                sl.position.set(15, 0, 5);
                return speed * this.length;
            } else {
                this.resetPosition(0, sphereSpeed/this.length);
                ball.translateX(-1);
                if(sl.target == ball) {
                    sl.target = this.ball;
                    sl.position.set(this.pivot.x, this.pivot.y, 5);
                }
                return 0;
            }
        }
        return sphereSpeed;
    }

    update(deltatime: number) {
        this.time += deltatime;
        const deltaX = this.pivot.x + this.length * Math.sin(this.theta(this.time)) - this.ball.position.x;
        const deltaY = this.pivot.y - this.length * Math.cos(this.theta(this.time)) - this.ball.position.y;
        this.ball.translateX(deltaX)
        this.ball.translateY(deltaY);
        this.ball.updateMatrix()
        const curve = new THREE.SplineCurve([
            this.pivot,
            new THREE.Vector2(this.ball.position.x, this.ball.position.y),
        ]);
        const points = curve.getPoints(100);
        this.line.geometry.setFromPoints(points);
        this.bbox.setFromObject(this.ball);
        if(enableBox) {
            this.helper.visible = true;
        } else {
            this.helper.visible = false;
        }
    }
}

class NewtonsCradle {
    pendulums: Pendulum[] = []
    constructor(scene:THREE.Scene, position: THREE.Vector2, initAngle: number) {
        const radius = 2;
        for(var i = -2; i < 3; i ++) {
            const xpos = position.x + i * radius *2+ 0.001 * i;
            const ypos = position.y
            var initialAngle = 0
            if(i == -2) {
                initialAngle = initAngle;
            }
            this.pendulums.push(new Pendulum(scene, radius, new THREE.Vector2(xpos, ypos), 10, initialAngle, 0));
        }
    }
    update(deltatime: number, light: THREE.SpotLight) {
        this.pendulums.forEach(pendulum => {
            pendulum.update(deltatime);
        })
        this.pendulums.forEach((pen, index) => {
            if(index == this.pendulums.length-1) {
                return;
            }
            pen.checkCollision(this.pendulums[index+1], light);
        })
    }
}

const clock = new THREE.Clock(true);

const newtonsCradle1 = new NewtonsCradle(scene, new THREE.Vector2(0, 0), -Math.PI / 4);
const newtonsCradle2 = new NewtonsCradle(scene, new THREE.Vector2(30,0), 0);

// Making a Platform
const platformGeometry = new THREE.BoxGeometry(100, 1, 30);
const platformMaterial = new THREE.MeshStandardMaterial({color: 0xffffff});
const platform = new THREE.Mesh(platformGeometry, platformMaterial);
platform.receiveShadow = true;
platform.translateY(-13);
scene.add(platform);

// Creating the ball
const ballGeometry = new THREE.SphereGeometry(3, 32, 16);
// const ballMaterial = new THREE.MeshStandardMaterial({color:0xffff00});
const ballMaterial = new THREE.ShaderMaterial({
    vertexShader: vertexPhongShaderSrc,
    fragmentShader: fragmentPhongShaderSrc,
    wireframe: false,
    uniforms: {
        Kd: {value: 0.5},
        Ks: {value: 0.5}
    },
});
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
var ballSpeed = 0;
ball.position.set(13+0.004, -9.5, 0)
// ball.position.set(0, 0, 0)
ball.castShadow = true;
scene.add(ball);
const loader = new THREE.TextureLoader();
const texture = loader.load('pix.png');
ballMaterial.map = texture;
const ball2Geometry = new THREE.SphereGeometry(3, 32, 16);
const ball2Material = new THREE.MeshStandardMaterial({color:0xffff00});
const ball2 = new THREE.Mesh(ball2Geometry, ball2Material);
ball2.position.set(13+0.004, -9.5, 0)

// Creating box for this
const bbox = new THREE.Box3().setFromObject(ball2);
const helper = new THREE.Box3Helper(bbox, new THREE.Color(0x00ff00));
scene.add(helper)

// Adding Lighting
const al = new THREE.AmbientLight(0xffffff, 0.05);
scene.add(al);

const pl = new THREE.PointLight(0xffffff, 1, 100, 2);
pl.position.set(12, -1, -3);
pl.castShadow = true
scene.add(pl);

const sl = new THREE.SpotLight(0xff0000, 0.7, 50, Math.PI/ 12, 0);
sl.target.position.set(0, -12, 0);
sl.position.set(15, 0, -5);
const slHelper = new THREE.SpotLightHelper(sl);
scene.add(sl, slHelper);

const sl2 = new THREE.SpotLight(0x00ff00, 1, 50, Math.PI/8, 0);
sl2.target.position.set(15, -12, 0)
sl2.position.set(15, 0, 0);
const slHelper2 = new THREE.SpotLightHelper(sl2);
scene.add(sl2, slHelper2);

// Setting up game loop
// *************************
function animate() {
    requestAnimationFrame(animate);
    const deltatime = clock.getDelta();
    // line.
    newtonsCradle1.update(deltatime, sl);
    newtonsCradle2.update(deltatime, sl);

    // Checking for end of newtons cradle 1 end pendulum collision with
    // the ball
    ballSpeed = newtonsCradle1.pendulums[newtonsCradle1.pendulums.length - 1].collisionWithBall(ball, bbox, ballSpeed, sl);
    ballSpeed = newtonsCradle2.pendulums[0].collisionWithBall(ball, bbox, ballSpeed, sl);
    ball2.translateX(ballSpeed * deltatime);
    ball.position.set(ball2.position.x, ball2.position.y, ball2.position.z);
    ball.updateMatrix()
    // ball.translateX(0, 0, 0);
    if(ballSpeed != 0) {
        // sl.target = ball;
        // sl.position.set(12, 0, 5);
        ball.rotation.z -= Math.sign(ballSpeed) * 0.1;
    } 
    // ball.position.set(ballPos.x, ballPos.y, ballPos.z);
    bbox.setFromObject(ball2);
    slHelper.update()
    cmaeraHelper.update()

    if(enableBox) {
        helper.visible = true;
        slHelper.visible = true;
        slHelper2.visible = true;
        cmaeraHelper.visible = true;
    } else {
        helper.visible = false;
        slHelper.visible = false;
        slHelper2.visible = false;
        cmaeraHelper.visible = false;
    }
    cameraPers.position.set(ball.position.x, ball.position.y + 10, ball.position.z);
    cameraPers.lookAt(ball.position.x, ball.position.y, ball.position.z);
    cameraPers.applyQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle))
    cameraPers.updateProjectionMatrix();
    // controls.target.set(ball.position.x, ball.position.y, ball.position.z)
    controls.update();
    if(!enableCamera) {
        renderer.render(scene, camera);
    } else {
        renderer.render(scene, cameraPers);
    }
}

if(WebGL.isWebGLAvailable()) {
    animate();
} else {
    const warning = WebGL.getWebGLErrorMessage();
    document.getElementById('container')?.appendChild(warning);
}