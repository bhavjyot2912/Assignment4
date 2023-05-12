import * as THREE from "https://cdn.skypack.dev/three@0.136.0";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/controls/OrbitControls";
import { RoundedBoxGeometry } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/geometries/RoundedBoxGeometry";
import { mergeBufferGeometries } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/utils/BufferGeometryUtils";

import { RoomEnvironment } from "https://cdn.skypack.dev/three@0.136.0/examples/jsm/environments/RoomEnvironment";

console.clear();

class NewtonsCradle extends THREE.Group {
	constructor() {
		super();
		// base jispe pendulums are hanging
		let baseG = new RoundedBoxGeometry(14, 1, 7, 3, 0.25).translate(0, 0.5, 0);
		let baseM = new THREE.MeshLambertMaterial({
			color: new THREE.Color(0, 0.75, 0.75).multiplyScalar(0.5),
		});
		let base = new THREE.Mesh(baseG, baseM);
		this.add(base);

		// frame
		let frameR = 0.25;
		let frameRound = 1.5;
		let frameW = 12;
		let frameH = 14;
		let frameD = 5;
		let radialSegs = 16;
		let gs = [];
		let cornerRound = new THREE.QuadraticBezierCurve3(
			new THREE.Vector3(-frameRound, 0, 0),
			new THREE.Vector3(-frameRound, -frameRound, 0),
			new THREE.Vector3(0, -frameRound, 0)
		);
		let tubeG = new THREE.TubeGeometry(cornerRound, 10, frameR, radialSegs);
		let vertG = new THREE.CylinderGeometry(
			frameR,
			frameR,
			frameH - frameRound,
			radialSegs,
			1,
			true
		).translate(0, (frameH - frameRound) * 0.5, 0);
		gs.push(
			tubeG
				.clone()
				.rotateZ(Math.PI * -0.5)
				.translate(
					-frameW * 0.5 + frameRound,
					frameH - frameRound,
					frameD * 0.5
				),
			tubeG
				.clone()
				.rotateZ(Math.PI)
				.translate(
					frameW * 0.5 - frameRound,
					frameH - frameRound,
					frameD * 0.5
				),
			vertG.clone().translate(-frameW * 0.5, 0, frameD * 0.5),
			vertG.clone().translate(frameW * 0.5, 0, frameD * 0.5),
			new THREE.CylinderGeometry(
				frameR,
				frameR,
				frameW - frameRound * 2,
				radialSegs,
				1,
				true
			)
				.rotateZ(Math.PI * 0.5)
				.translate(0, frameH, frameD * 0.5)
		);

		let g = mergeBufferGeometries(gs);
		g = mergeBufferGeometries([g.clone(), g.clone().translate(0, 0, -frameD)]);
		let tubeM = new THREE.MeshLambertMaterial();
		let frame = new THREE.Mesh(g, tubeM);
		frame.position.y = 1;
		this.add(frame);

		// balls of the pendulum
		let ballsCount = 5;
		let ballSystemGeoms = [];
		let ballRadius = 1.115;
		let stringHeight = frameH - 1.5 - 1.115;
		let stringLength = Math.sqrt(
			stringHeight * stringHeight + frameD * 0.5 * frameD * 0.5
		);
		let stringG = new THREE.CylinderGeometry(
			0.0375,
			0.0375,
			stringLength,
			8,
			1,
			true
		)
			.translate(0, stringLength * 0.5, 0)
			.rotateX(Math.PI * 0.5);
		ballSystemGeoms.push(
			new THREE.SphereGeometry(ballRadius, 36, 18).translate(
				0,
				-frameH + 1.5,
				0
			),
			stringG
				.clone()
				.lookAt(new THREE.Vector3(0, stringHeight, frameD * 0.5))
				.translate(0, -stringHeight, 0),
			stringG
				.clone()
				.lookAt(new THREE.Vector3(0, stringHeight, frameD * -0.5))
				.translate(0, -stringHeight, 0)
		);

		let ballSystemGeom = mergeBufferGeometries(ballSystemGeoms);
		let ballSystemMat = new THREE.MeshStandardMaterial({
			color: 0x888888,
			metalness: 1,
			roughness: 0.25,
		});
		let ballSystem = new THREE.InstancedMesh(
			ballSystemGeom,
			ballSystemMat,
			ballsCount
		);

		let moveableDummies = new Array(ballsCount).fill().map((p, idx) => {
			let ballDummy = new THREE.Object3D();
			ballDummy.position.x = (-(ballsCount - 1) * 0.5 + idx) * 2.23;
			ballDummy.updateMatrix();
			ballSystem.setMatrixAt(idx, ballDummy.matrix);
			ballDummy.initPhase = Math.PI;
			ballDummy.maxAngle = THREE.MathUtils.degToRad(5);
			ballDummy.instanceIndex = idx;
			if (idx === 0 || idx === ballsCount - 1) {
				ballDummy.initPhase = 0;
				ballDummy.clampPhase = {
					min: idx === 0 ? -Math.PI : 0,
					max: idx === 0 ? 0 : Math.PI,
				};
				ballDummy.maxAngle = Math.PI * 0.125;
			}
			return ballDummy;
		});
		ballSystem.position.y = frameH;
		frame.add(ballSystem);

		this.update = (t) => {
			moveableDummies.forEach((md) => {
				let a = Math.sin(t * Math.PI * 2) * md.maxAngle;
				if (md.clampPhase) {
					let c = md.clampPhase;
					let mn = c.min,
						mx = c.max;
					a = THREE.MathUtils.clamp(a, mn, mx);
				}
				md.rotation.z = a;
				md.updateMatrix();
				ballSystem.setMatrixAt(md.instanceIndex, md.matrix);
			});
			ballSystem.instanceMatrix.needsUpdate = true;
		};
	}
}

let bgColor = new THREE.Color(0x222222);
let scene = new THREE.Scene();
scene.background = bgColor;
let camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 1, 1000);
camera.position.set(-20, 7, 20).setLength(37);
let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;//soft
document.body.appendChild(renderer.domElement);
window.addEventListener("resize", (event) => {
	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(innerWidth, innerHeight);
});

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(
	new RoomEnvironment(),
	0.04
).texture;

let controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 7, 0);
controls.enablePan = false;
controls.enableDamping = true;
//controls.autoRotate = true;
controls.maxPolarAngle = Math.PI * 0.5;
controls.update();

let lightTarget = new THREE.Object3D();
lightTarget.position.setScalar(-1);
let light = new THREE.DirectionalLight(0xffffff, 0.5);
light.position.set(0, 7, 0);
light.add(lightTarget);
light.target = lightTarget;
light.castShadow = true;
let shadowCamHalfSize = 25;
let multiplier = 0.4;
light.shadow.camera.top = shadowCamHalfSize * multiplier;
light.shadow.camera.bottom = -shadowCamHalfSize * multiplier;
light.shadow.camera.left = -shadowCamHalfSize * multiplier;
light.shadow.camera.right = shadowCamHalfSize * multiplier;
light.shadow.camera.near = -shadowCamHalfSize * 0.5;
light.shadow.camera.far = shadowCamHalfSize * 1.5;
light.shadow.mapSize.width = light.shadow.mapSize.height = 1024;
//console.log(light.shadow.camera);
scene.add(light, new THREE.AmbientLight(0xffffff, 0.5));

//let shadowCameraHelper = new THREE.CameraHelper(light.shadow.camera);
//scene.add(shadowCameraHelper);

let newtonsCradle = new NewtonsCradle();
newtonsCradle.traverse((part) => {
	if (part.isMesh) {
		part.castShadow = true;
		part.receiveShadow = true;
	}
});
scene.add(newtonsCradle);
newtonsCradle.update(0.25);

let gu = {
	time: { value: 0 },
	bgColor: { value: bgColor },
	dataInit: { value: null },
	dataMap: { value: null },
};

// <lightmap>
const mapSize = 32;
let lightCounter = 0;
let lightUV = [];

let posData = new THREE.PlaneGeometry(1, 1, mapSize - 1, mapSize - 1);
let data = new Uint8Array(mapSize * mapSize * 4); //position (2), color (1), luma/size (1) = 4
let v4 = new THREE.Vector4();
let v2 = new THREE.Vector2();
let v2center = new THREE.Vector2().setScalar(-0.5);
for (let i = 0; i < mapSize * mapSize; i++) {
	v2.fromBufferAttribute(posData.attributes.uv, i);

	let v2len = Math.hypot(v2.x - 0.5, v2.y - 0.5);
	v4.setScalar(0);
	if (v2len < 0.5 && v2len > 0.2) {
		v4.random();
		lightUV.push(v2.x, v2.y);
		lightCounter++;
	}
	v4.multiplyScalar(255).floor();
	data[i * 4 + 0] = v4.x;
	data[i * 4 + 1] = v4.y;
	data[i * 4 + 2] = v4.z;
	data[i * 4 + 3] = v4.w === 0 ? 0 : Math.floor(Math.random() * 255);
}
const texture = new THREE.DataTexture(data, mapSize, mapSize);
texture.needsUpdate = true;
console.log(lightCounter);

// <rendertarget>
let rt = new THREE.WebGLRenderTarget(mapSize, mapSize, {
	magFilter: THREE.NearestFilter,
	minFilter: THREE.NearestFilter,
});
let rtCanvas = new THREE.Mesh(
	new THREE.PlaneGeometry(2, 2),
	new THREE.MeshBasicMaterial({
		onBeforeCompile: (shader) => {
			shader.uniforms.time = gu.time;
			shader.uniforms.dataInit = gu.dataInit;
			shader.fragmentShader = `
			uniform float time;
			uniform sampler2D dataInit;
			${shader.fragmentShader}
		`.replace(
				`#include <dithering_fragment>`,
				`#include <dithering_fragment>
			
			float t = time * 0.1;
			
			vec2 dataUV = floor(vUv * 32.) / 32. + (vUv / 32.) * 0.5;
			
			vec4 initData = texture2D(dataInit, dataUV);
			float initDataSum = floor(initData.x + initData.y + initData.z + initData.w);
			vec4 col = vec4(0);
			if(initDataSum > 0.){

				col.z = initData.b;

				float lumaSin = sin((initData.w + t) * PI2) * 0.5 + 0.5;
				col.w = initDataSum == 0. ? 0. : lumaSin * 0.5 + 0.5 ;
				
				float tMove = time * 0.5;
				col.x = cos(tMove + initData.r * PI2) * initData.r * 0.5 + 0.5;
				col.y = sin(tMove + initData.g * PI2) * initData.g * 0.5 + 0.5;
				
			}
			gl_FragColor = col;
			`
			);
			//console.log(shader.fragmentShader);
		},
	})
);
rtCanvas.material.defines = { USE_UV: "" };
let rtCamera = new THREE.Camera();
// </rendertarget>

// </lightmap>

// <spheres>

gu.dataInit.value = texture;
gu.dataMap.value = rt.texture;

let sphereG = new THREE.InstancedBufferGeometry().copy(
	new THREE.SphereGeometry(1, 32, 16)
);
sphereG.instanceCount = lightCounter;
sphereG.setAttribute(
	"instUV",
	new THREE.InstancedBufferAttribute(new Float32Array(lightUV), 2)
);
let sphereM = new THREE.MeshBasicMaterial({
	color: 0xffffff,
	onBeforeCompile: (shader) => {
		shader.uniforms.dataMap = gu.dataMap;
		shader.vertexShader = `
			uniform sampler2D dataMap;
			attribute vec2 instUV;
			varying vec3 dataColor;
			varying float tint;
			${hsb2rgb}
			${shader.vertexShader}
		`
			.replace(
				`#include <begin_vertex>`,
				`#include <begin_vertex>
				
				vec4 dataMapData = texture2D(dataMap, instUV);
				
				vec3 instPos = vec3(0);
				instPos.xz = (floor(instUV * 32.) / 32. + (dataMapData.rg / 32.)) * 250. - 125.;
				instPos.z *= -1.;
				float sScale = dataMapData.w * (250. / 32.) * 0.5; 
				instPos.y = sScale;
				transformed *= sScale;
				transformed += instPos;
				dataColor = hsb2rgb(vec3(dataMapData.z, 1., 1.));
				
				
			`
			)
			.replace(
				`#include <fog_vertex>`,
				`#include <fog_vertex>
				tint = dot((normalMatrix * normal), normalize(-mvPosition.xyz));
				tint = clamp(tint, 0., 1.);
			`
			);
		//console.log(shader.vertexShader);
		shader.fragmentShader = `
			#define ss(a, b, c) smoothstep(a, b, c)
			varying vec3 dataColor;
			varying float tint;
			${shader.fragmentShader}
		`.replace(
			`vec4 diffuseColor = vec4( diffuse, opacity );`,
			`
				float tintFade = ss(0.875, 0.125, tint);
				vec3 col = mix(dataColor * 0.5, dataColor + 0.25, 0.5 + 0.5 * tintFade) * 0.875;
				vec4 diffuseColor = vec4(col, opacity );
			`
		);
		//console.log(shader.fragmentShader);
	},
});
let sphere = new THREE.Mesh(sphereG, sphereM);
sphere.frustumCulled = false;
// scene.add(sphere);
// </spheres>

let ground = new THREE.Mesh(
	new THREE.PlaneGeometry(250, 250).rotateX(Math.PI * -0.5),
	new THREE.MeshLambertMaterial({
		color: 0xaaaaaa,
		//map: texture,
		onBeforeCompile: (shader) => {
			shader.uniforms.bgColor = gu.bgColor;
			shader.uniforms.dataMap = gu.dataMap;
			shader.fragmentShader = `
				uniform vec3 bgColor;
				uniform sampler2D dataMap;
				${hsb2rgb}
				${shader.fragmentShader}
			`.replace(
				`#include <dithering_fragment>`,
				`#include <dithering_fragment>

					vec3 cTotal = bgColor;
					vec2 dmUvHalfStep = (vUv / 32.) * 0.5;
					vec2 cId = floor(vUv * 32.);
					for(int i = -1; i <= 1; i++){
						for(int j = -1; j <= 1; j++){
							// get data from texture
							vec2 currCID = cId + vec2(j,i);
							vec2 dmUv = currCID / 32. + dmUvHalfStep;
							vec4 dataMapData = texture2D(dataMap, dmUv);
							
							vec3 dataMapColor = hsb2rgb(dataMapData.w == 0. ? bgColor : vec3(dataMapData.b, 1., 1.));
							
							vec2 cUv = fract(vUv * 32.) - (vec2(j,i) + dataMapData.rg);
							float lightC = smoothstep(1.5 * dataMapData.w, 0., length(cUv));
							lightC = pow(lightC, 2.7);
							cTotal += dataMapColor * lightC * 0.875;
						}
					}
					
					float f = smoothstep(0.2, 0.05, length(vUv - 0.5)); // central spot
					f *= f;
					gl_FragColor.rgb = mix(cTotal, gl_FragColor.rgb, f);
					
				`
			);
			//console.log(shader.fragmentShader);
		},
	})
);
ground.material.defines = { USE_UV: "" };
ground.receiveShadow = true;
// scene.add(ground);

let clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
	let t = clock.getElapsedTime();

	gu.time.value = t;

	renderer.setRenderTarget(rt);
	renderer.render(rtCanvas, rtCamera);

	controls.update();
	newtonsCradle.update(t);
	renderer.setRenderTarget(null);
	renderer.render(scene, camera);
});
 