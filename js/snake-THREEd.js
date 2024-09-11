var renderer, scene, camera, cubo;
var cameraControls;
var angulo = -0.01;
var cameraTop;
var ctx;

const controls = {
    // for some reason on the first frame collision w ground is not detected so we die
    // so we start with false and death just negates controls.enabled, so control is live
    // when the scene loads
    // same for main_camera_is_3d
    enabled: false,
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    main_camera_is_3d: true,
    speed_arrow_visible: true,
    speed_multiplier: 1,
    speed: 0.5,
    flashlight_power: 0.5,
    is_debug_view: false,
};

const stats = new Stats()
const raycaster = new THREE.Raycaster();
var objectsToCheck;
var points = 0
var debug_was_enabled = controls.is_debug_view

init();
const axesHelper = new THREE.AxesHelper( 1000 );
scene.add(axesHelper);

center_side = 15
pl = createPlane(500, center_side)
plane = pl[0]
center = pl[1]
center.position.y += plane.position.y + 0.01
scene.add(center)
scene.add(plane)

scatterObstacles(450, center_side+5, 1000)
snake = createSnake()
snake.position.y += 1

minimapArrow = createArrow()
minimapArrow.position.z += 7

mainCameraArrow = minimapArrow.clone()
minimapArrow.position.y += 100



snake.add(mainCameraArrow)
snake.add(minimapArrow)

scene.add(
    snake
)
p_pos = snake.position
snake.add(cameraTop)
//snake.add(camera)


the_ground = scene.children.filter(obj => obj !== snake && obj === plane)
render();

var time = 0

// Event listeners para controles
document.addEventListener('keydown', (event) => {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            controls.moveForward = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            controls.moveBackward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            controls.moveLeft = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            controls.moveRight = true;
            break;
        case 'KeyC':
            controls.main_camera_is_3d = !controls.main_camera_is_3d
            console.log('Set `main_camera_is_3d` to ', controls.main_camera_is_3d)
    }
});

document.addEventListener('keyup', (event) => {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            controls.moveForward = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            controls.moveBackward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            controls.moveLeft = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            controls.moveRight = false;
            break;
    }
});

function init()
{
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( new THREE.Color(0xFFFFFF) );
    document.getElementById('container').appendChild( renderer.domElement );

    // Configurar el canvas de texto
    textCanvas = document.getElementById("text_canvas");
    ctx = textCanvas.getContext("2d");
    // quiero que tenga las mismas dimensiones que el canvas del three.js
    textCanvas.width = window.innerWidth;
    textCanvas.height = window.innerHeight;  
  
    scene = new THREE.Scene();
  
    var aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 50, aspectRatio , 1, 10000 );
    camera.position.set( 50, 30, 30 );
  
    // vista de planta
    cameraTop = new THREE.OrthographicCamera( -25, 25, 25, -25, 1, 1000 );
    cameraTop.position.set(0,500,0);
    cameraTop.lookAt( 0, 0, 0 );
    cameraTop.up.set( 0, 0, 1 );
    cameraTop.updateProjectionMatrix();
    cameraTop.rotation.z = Math.PI

    cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
    cameraControls.target.set( 0, 0, 0 );
    cameraControls.maxPolarAngle = Math.PI/4
    cameraControls.enableZoom = false
  
    window.addEventListener('resize', updateAspectRatio );

    stats.showPanel(0);
    document.getElementById('container').appendChild(stats.domElement)

    var gui = new dat.GUI()
    var gui_is_3d = gui.addFolder('Camera')
    gui_is_3d.add(controls, 'main_camera_is_3d', true, false).name('Cámara en 3d').listen()
    gui_is_3d.add(controls, 'speed_arrow_visible', true, false).name('Ver velocidad').listen()
    gui_is_3d.add(controls, 'is_debug_view', true, false).name('Vista Debug')

    var gui_gameplay = gui.addFolder('Gameplay')
    gui_gameplay.add(controls, 'speed_multiplier', 0.1, 5).name('Velocidad').listen()
    gui_gameplay.add(controls, 'flashlight_power', 0.5, 2).name('Potencia Luz').listen()

    gui_gameplay.open()
    gui_is_3d.open()

}

function createArrow()
{
  const shaftMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  const tipsMaterial = new THREE.MeshBasicMaterial( {color: 0xff0000} );

  flecha = new THREE.Object3D()

  
  let shaftGeo = new THREE.CylinderGeometry(1, 1, 10, 32);
  let shaft = new THREE.Mesh(shaftGeo, shaftMaterial);

  let tipGeo = new THREE.ConeGeometry(2, 4, 32);

  let tip = new THREE.Mesh(tipGeo, tipsMaterial);

  // los objetos se crean con 0,0,0 como centro.
  // Para conectar la flecha, hay que moverla a un extremo del
  // shaft

  tip.position.y = 5

  //...y rotar bottom
  //                Eje X                     Theta

  flecha.add(tip);
  flecha.add(shaft);

  flecha.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI/2)
  flecha.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI/2)

  return flecha
}

function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function createSnakeSegment(l) {

    segment = new THREE.Object3D()
    segment.name = 'snake_segment'
    boxGeo = new THREE.BoxGeometry(l, l, l)
    box = new THREE.Mesh(
        boxGeo,
        new THREE.MeshBasicMaterial({color: 0x00ff00})
    )

    edges = new THREE.EdgesGeometry( boxGeo ); 
    line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial( { color: 0x000000 } ) ); 
    
    segment.add(box)
    segment.add(line)

    return segment
}

function createFaceTongue() {
    let snake_tongue_vertices = new Float32Array([
        -0.15,0,0,
        0.15, 0, 0,
        -0.15, 0, 1,
        0.15, 0, 1
    ])
    let indices = [
        2, 1, 0,
        0, 1, 2,
        3, 1, 0,
        0, 1, 3
    ]

    var tongueGeo = new THREE.BufferGeometry();

    tongueGeo.setIndex(indices)
    tongueGeo.setAttribute( 'position', new THREE.BufferAttribute( snake_tongue_vertices, 3 ) );
    tongueGeo.computeVertexNormals()
  
    tongue = new THREE.Mesh(
      tongueGeo,
      new THREE.MeshBasicMaterial({color: 0xff0000})
    )
    tongue.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI/2)
    tongue.position.y += 0.15

    return tongue
}

function createFace() {
    face = new THREE.Object3D()
    face.name = 'snake_face'

    faceGeo = new THREE.ConeGeometry(0.5, 1, 32)
    faceCone = new THREE.Mesh(
        faceGeo,
        new THREE.MeshBasicMaterial({color: 0x00ff00})
    )
    
    
    edges = new THREE.EdgesGeometry( faceGeo ); 
    line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial( { color: 0x000000 } ) ); 
    
    face.add(faceCone)
    face.add(line)

    eye_l = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 0.1),
        new THREE.MeshBasicMaterial({color: 0x000000})
    )
    eye_l.position.z -= 0.2
    
    eye_r = eye_l.clone()
    
    eye_l.position.x += 0.2
    eye_r.position.x -= 0.2
    
    face.add(eye_l)
    face.add(eye_r)

    face.rotateOnAxis(new THREE.Vector3(1, 0, 0), Math.PI /2);
    face.position.z += 1


    tongue = createFaceTongue()
    face.add(tongue)

    

    return face
}

function createSnake() {

    let snake = new THREE.Object3D()
    snake.name = 'snake_head'

    snake.add(
        createSnakeSegment(1)
    )
    
    snake.add(
        createFace()
    )
    
    flashlight_bot = new THREE.PointLight(0xffffff, controls.flashlight_power, 50)
    flashlight_bot.name = 'flashlight_bot'
    
    flashlight_top = new THREE.PointLight(0xffffff, controls.flashlight_power, 50)
    flashlight_top.position.y += 50
    flashlight_top.name = 'flashlight_top'

    snake.add(flashlight_bot)
    snake.add(flashlight_top)

    return snake
}

function createPlane(plane_side, center_side) {
    // Crear y añadir un plano que actúe como suelo
    const planeGeometry = new THREE.PlaneGeometry(plane_side, plane_side);
    const planeMaterial = new THREE.MeshBasicMaterial({color: 0x000000, side: THREE.DoubleSide});
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);

    // crear el centro q sea visible
    const center = new THREE.Mesh(
        new THREE.PlaneGeometry(center_side, center_side),
        new THREE.MeshBasicMaterial({color: 0x123456789, side: THREE.DoubleSide})
    )
    center.rotation.x = Math.PI / 2
    plane.rotation.x = Math.PI / 2; // Rotar el plano para que esté horizontal
    plane.name = 'ground'
    return [plane, center]
}

function scatterObstacles(plane_side, center_side, how_many) {

    // Generar y añadir cubos como edificios
    for (let i = 0; i < how_many; i++) {
        // Dimensiones aleatorias para los edificios
        const width = 5 + Math.random() * 5;
        const depth = 5 + Math.random() * 5;
        const height = Math.random() * 15 + 5; // Altura entre 5 y 20

        // Geometría y material para los edificios
        const boxGeometry = new THREE.BoxGeometry(width, height, depth);
        const boxMaterial = new THREE.MeshLambertMaterial({color: 0xff0000});

        // Crear el mesh del edificio y posicionarlo
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        rdx = Math.random()
        rdy = Math.random()
        box.position.x = rdx * plane_side - plane_side/2; // Posición aleatoria en X dentro del plano
        box.position.z = rdy * plane_side - plane_side/2; // Posición aleatoria en Z dentro del plano
        box.position.y = height / 2; // Ajustar la posición en Y para que la base esté sobre el suelo

        if (Math.abs(box.position.x) <= 10 && Math.abs(box.position.z) <= 10) {
            box.position.x += center_side + 5; // Moverlo fuera de la zona central
            box.position.z += center_side + 5;
        }

        // Añadir el edificio a la escena
        box.name = 'obstacle at' + rdx + ', ' + rdy
        scene.add(box);
    }
}

function updatePoints(points) {

    ctx.clearRect(0, 0, textCanvas.width, textCanvas.height); // Limpiar el canvas antes de redibujar
    ctx.font = "24px Arial";
    ctx.fillStyle = "white";
    ctx.fillText("Puntos: " + points, 50, 80);

}


function update()
{
  // Cambios para actualizar la camara segun mvto del raton
  cameraControls.update();
  stats.update()

  time += 0.01;

  // avoid updating materials all the time
  if (debug_was_enabled != controls.is_debug_view && controls.enabled) {
    debug_was_enabled = controls.is_debug_view

    if (controls.is_debug_view) {
        mat = new THREE.MeshNormalMaterial()
    } else {
        mat = new THREE.MeshLambertMaterial({color: 0xff0000})
    }
    scene.traverse((object) => {
        // Check if the object is a Mesh and its name starts with 'obstacle'
        if (object.isMesh && object.name.startsWith('obstacle')) {
          // Assign the MeshNormalMaterial to the object
          object.material = mat;
        }
    })
    controls.speed_arrow_visible = true
  }

  flashlight_bot = snake.getObjectByName('flashlight_bot', true)
  flashlight_top = snake.getObjectByName('flashlight_top', true)
  flashlight_bot.intensity = controls.flashlight_power
  flashlight_top.intensity = controls.flashlight_power

  // Calcular el vector de dirección de vista
  let velocity = new THREE.Vector3(Math.sin(angulo), 0, Math.cos(angulo));
  if (controls.enabled) {

        
    // Actualizar el ángulo basado en los controles de izquierda y derecha
    if (controls.moveLeft) {
        angulo += 0.05;
        //player_indicator.rotateOnAxis(new THREE.Vector3(0,0,1), angulo)
    }
    if (controls.moveRight) {
        angulo -= 0.05;
        //player_indicator.rotateOnAxis(new THREE.Vector3(0,0,1), angulo)
    }


    // mueve el personaje
    if (controls.moveForward) {

        // Configurar el rayo desde la posición actual del jugador y en la dirección de movimiento
        raycaster.set(p_pos, velocity);
        // Detectar intersecciones con objetos en la escena (por ejemplo, las paredes)
        objectsToCheck = scene.children.filter(obj => obj !== snake && obj !== axesHelper);    
        intersects = raycaster.intersectObjects(objectsToCheck, true);
        // Si no hay intersección, permitir el movimiento
        
        collides = false
        for (i = 0; i < intersects.length; i++) {
            if (intersects[i].distance > 0 && intersects[i].distance <= controls.speed+0.7 ) {
                // mueve el personaje
                collides = true
                console.log(intersects[i])
                break
                }  
        }

        if (!collides) {
            new_snake_segment = createSnakeSegment( 0.7 )
            new_snake_segment.position.set(p_pos.x, p_pos.y, p_pos.z)
            
            scene.add(new_snake_segment)
            p_pos.add(velocity.clone().multiplyScalar(controls.speed+0.7))
            
            console.log("YOU're safe")
            points += 1
        } else
            triggerDeath('crashed', intersects[i])

        }
    }

  raycaster.set(p_pos, new THREE.Vector3(0, -1, 0))
  touches_ground = raycaster.intersectObjects(the_ground, true)

  if (touches_ground.length == 0) {
    triggerDeath('fell')
  }
  
  


  snake.rotation.y = angulo

  // camara en primera persona
  //camera.position.set(p_pos.x, p_pos.y+10, p_pos.z);
  snake.position.set(p_pos.x, p_pos.y, p_pos.z)


  controls.speed = Math.abs(Math.sin(time)) * controls.speed_multiplier
  if (controls.enabled) {
    mainCameraArrow.scale.set(1 , Math.max( 0.15, controls.speed), 1)
    minimapArrow.scale.set(1 , Math.max( 0.15, controls.speed), 1)
  }

  cameraControls.target.set(p_pos.x -10, p_pos.y - 10, p_pos.z - 10)
  //camera.position.set(p_pos.x +10, p_pos.y + 10, p_pos.z + 10)
  // y mirando hacia adelante
  //camera.lookAt(p_pos);
}

function triggerDeath(reason, collided_obj) {
    console.log("[PH]: DEATH! reason:", reason)

    // fix for the first death trigger randomly ocurring
    if (controls.enabled) {
        controls.speed_arrow_visible = false
        var loader = new THREE.FontLoader();
        // from https://threejs.org/docs/#examples/en/geometries/TextGeometry
        loader.load( 'fonts/helvetiker_regular.typeface.json', function ( font ) {

            const geometry = new THREE.TextGeometry( 'Linguini died !\n'+reason + '\n' , {
                font: font,
                size: 80,
                depth: 5,
                curveSegments: 12,
                bevelEnabled: true,
                bevelThickness: 10,
                bevelSize: 8,
                bevelOffset: 0,
                bevelSegments: 5
            } );

            text = new THREE.Mesh(
                geometry,
                new THREE.MeshNormalMaterial()
            )
            text.scale.set(0.05, 0.05, 0.05)
            cameraTop.add(text)

            text.position.z -= 50
            text.position.x -= 15

            }
        )

        // light up the scene
        scene.traverse((object) => {
            // Check if the object is a Mesh and its name starts with 'obstacle'
            if (object.isMesh && object.name.startsWith('obstacle')) {
              // Assign the MeshNormalMaterial to the object
              object.material = new THREE.MeshNormalMaterial();
            }
        })
        controls.main_camera_is_3d = false
    }



    controls.enabled = !controls.enabled
}

function render()
{
	requestAnimationFrame( render );
	update();
    updatePoints(points)

    if (!controls.speed_arrow_visible) {
        minimapArrow.visible = false
        mainCameraArrow.visible = false
    }

    flashlight_bot = snake.getObjectByName('flashlight_bot', true)
    flashlight_top = snake.getObjectByName('flashlight_top', true)


    ds = Math.min(window.innerHeight , window.innerWidth)/4;
    if (controls.main_camera_is_3d) {
        cam_3d_w = window.innerWidth
        cam_3d_h = window.innerHeight
        cam_mini_w = ds
        cam_mini_h = ds
    } else {
        cam_3d_w = ds
        cam_3d_h = ds
        cam_mini_w = window.innerWidth
        cam_mini_h = window.innerHeight
    }


    let velocity = new THREE.Vector3(Math.sin(angulo), 0, Math.cos(angulo));
    if (controls.speed_arrow_visible) {
        minimapArrow.visible = false
        mainCameraArrow.visible = true
    }

    // vista 3d perspectiva
    renderer.autoClear = false;
    renderer.setViewport(0,0,cam_3d_w,cam_3d_h);
	renderer.setClearColor( new THREE.Color(0x000000) );
	renderer.clear();

    flashlight_top.visible = false
    flashlight_bot.visible = true
	
    renderer.render( scene, camera );

    if (controls.speed_arrow_visible) {
        minimapArrow.visible = true
        mainCameraArrow.visible = false
    }

    // vista de arriba
    renderer.setViewport(0,0,cam_mini_w,cam_mini_h);
	renderer.setScissor(0, 0, ds, ds);
	renderer.setScissorTest(true);
	renderer.setClearColor( new THREE.Color(0xaffff) );
	renderer.clear();	

	renderer.setScissorTest(false);

    flashlight_top.visible = true
    flashlight_bot.visible = false

    renderer.render(scene, cameraTop);

    if (controls.speed_arrow_visible)
        mainCameraArrow.visible = true

}