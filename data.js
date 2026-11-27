// Contenido del juego. Puedes editar este archivo para cambiar preguntas, productos o categorías.
window.DATA = {

// ---------- 100 Mexicanos Dijeron ----------
// [pregunta, [[respuesta, puntos], ...]]  Encuestas inventadas para jugar.
feud: [
['Algo que nunca falta en la cena de Nochebuena',[['Pavo',32],['Bacalao',22],['Romeritos',18],['Pierna',14],['Ensalada de manzana',8],['Ponche',6]]],
['Algo que haces cuando suena el despertador',[['Apagarlo',38],['Posponerlo',27],['Ver el celular',15],['Levantarte',10],['Enojarte',6]]],
['Algo que llevas a la playa',[['Bloqueador',30],['Toalla',25],['Traje de baño',18],['Lentes de sol',12],['Hielera',8],['Sombrero',5]]],
['Un pretexto para llegar tarde',[['El tráfico',40],['Me quedé dormido',22],['Se descompuso el coche',14],['No había Uber',10],['Mi mamá',8]]],
['Algo que hace la tía en la cena familiar',[['Preguntar cuándo te casas',35],['Criticar',20],['Chismear',18],['Servirte de más',12],['Tomar fotos',8],['Sacarte a bailar',7]]],
['Algo que se pierde en una fiesta',[['El celular',30],['Las llaves',25],['La cartera',18],['La dignidad',15],['Un zapato',7]]],
['Algo que hay en la bolsa de una mamá',[['Pañuelos',28],['Dulces',22],['Medicinas',18],['Cartera',14],['Gel antibacterial',10],['Curitas',8]]],
['Una razón para no ir al gimnasio',[['Flojera',38],['Cansancio',22],['Falta de tiempo',18],['Está lloviendo',10],['Me duele algo',8]]],
['Algo que se toma en la cena de Navidad',[['Ponche',35],['Sidra',22],['Refresco',15],['Vino tinto',12],['Rompope',8],['Tequila',5]]],
['Algo que haces en el tráfico',[['Escuchar música',30],['Ver el celular',25],['Desesperarte',18],['Echar claxon',12],['Cantar',10]]],
['Una comida que pides cuando estás crudo',[['Chilaquiles',32],['Menudo',25],['Tacos',18],['Pozole',12],['Caldo de camarón',8]]],
['Algo que haces el 25 de diciembre',[['Recalentado',35],['Dormir',25],['Abrir regalos',18],['Ver películas',10],['Ir a misa',7]]],
['Algo que se rompe en Navidad',[['Las series de luces',40],['Las esferas',25],['La piñata',15],['La dieta',12],['El presupuesto',6]]],
['Algo que la gente hace en el elevador',[['Ver el celular',35],['Ver los números',22],['Mirarse en el espejo',18],['Saludar',12],['Aguantar la respiración',8]]],
['Un lugar donde haces fila',[['El banco',35],['El súper',25],['El cine',15],['El SAT',12],['El baño',8]]],
['Algo que dices cuando te pegas en el dedo chiquito',[['¡Ay!',35],['Una grosería',30],['¡Auch!',15],['¡Mi madre!',12],['Nada, solo lloras',5]]],
['Un regalo que nadie quiere en el intercambio',[['Calcetines',28],['Taza',22],['Perfume barato',15],['Agenda',12],['Pantuflas',10],['Set de baño',8]]],
['Algo que se te olvida al salir de viaje',[['El cargador',33],['El cepillo de dientes',25],['Los calzones',15],['El pasaporte',12],['Las medicinas',8]]],
['Algo que haces en una boda',[['Bailar',35],['Comer',22],['Tomar',18],['Llorar',10],['Agarrar el ramo',8]]],
['Algo que tiene un buen mexicano en su refrigerador',[['Salsa',30],['Tortillas',25],['Limones',18],['Coca-Cola',12],['Queso',8],['Frijoles',5]]],
['Algo que te da miedo encontrar en tu casa',[['Una rata',35],['Una cucaracha',30],['Una araña',15],['Un ladrón',12],['Un fantasma',5]]],
['Una excusa para no contestar el teléfono',[['Estaba manejando',30],['No lo oí',28],['Estaba dormido',18],['Me quedé sin pila',12],['Estaba en junta',8]]],
['Algo que haces cuando no te puedes dormir',[['Ver el celular',38],['Contar borregos',20],['Ver la tele',15],['Tomar té',12],['Dar vueltas',10]]],
['Algo que se lleva o se reparte en una posada',[['Ponche',30],['Bolsita de dulces',22],['Velitas',18],['Piñata',15],['Tamales',10]]],
['Algo que hacen los mexicanos en el Mundial',[['Ver los partidos',35],['Gritar',22],['Faltar al trabajo',15],['Tomar cerveza',13],['Ir al Ángel',10]]],
['Algo que le pides al mesero',[['La cuenta',35],['Agua',22],['Salsa',15],['Servilletas',12],['El menú',10]]],
['Algo que la gente hace en Año Nuevo para la buena suerte',[['Comer las 12 uvas',35],['Ropa interior de color',22],['Salir con maletas',18],['Barrer hacia afuera',10],['Comer lentejas',8]]],
['Una aplicación que todos tienen en el celular',[['WhatsApp',40],['Instagram',20],['Facebook',15],['TikTok',12],['Uber',8]]],
['Algo que se le pone a los tacos',[['Salsa',35],['Limón',25],['Cebolla',15],['Cilantro',12],['Piña',8]]],
['Algo que dices cuando ganas un concurso',[['¡Gracias!',30],['¡No lo puedo creer!',25],['¡Sí!',20],['Gracias a mi mamá',12],['¿Neta?',8]]],
['Un lugar donde no debes contestar el celular',[['En el cine',30],['Manejando',28],['En misa',18],['En una junta',12],['En el baño',8]]],
['Algo que haces cuando llega la quincena',[['Pagar deudas',35],['Ir de compras',22],['Salir a comer',18],['Ahorrar',12],['Comprar en línea',8]]],
['Algo que le pides a Santa ya de adulto',[['Dinero',30],['Un viaje',22],['Un celular',18],['Ropa',12],['Salud',10],['Un coche',8]]],
['Una película que se ve en Navidad',[['Mi pobre angelito',40],['El Grinch',25],['Elf',12],['El expreso polar',10],['Cuento de Navidad',8]]],
['Algo que haces en el baño además de bañarte',[['Ver el celular',35],['Cantar',25],['Pensar',18],['Lavarte los dientes',12],['Llorar',5]]],
['Algo que haces cuando te deja tu pareja',[['Llorar',35],['Comer helado',20],['Salir con amigos',18],['Escuchar canciones tristes',15],['Escribirle',8]]],
['Algo que compras en el Oxxo',[['Refresco',30],['Papas',22],['Cigarros',15],['Cerveza',13],['Recargas',10],['Café',7]]],
['Algo que se te pega en la ropa',[['Pelos de perro',35],['Chicle',25],['Pelusa',18],['Manchas',12],['Etiquetas',5]]],
['Algo que hay en un cumpleaños mexicano',[['Pastel',35],['Las mañanitas',25],['Piñata',15],['La mordida',15],['Velitas',8]]],
['Algo que te pones cuando hace frío',[['Chamarra',35],['Bufanda',22],['Suéter',18],['Guantes',10],['Gorro',10]]],
['Algo que se te hace tarde para pagar',[['La tarjeta de crédito',35],['La luz',22],['La renta',18],['El teléfono',12],['El predial',8]]],
['Un superhéroe',[['Superman',30],['Batman',25],['El Hombre Araña',22],['Iron Man',12],['El Chapulín Colorado',8]]],
['Algo que se compra a última hora el 24',[['Regalos',35],['Hielo',20],['Pan',15],['Refresco',12],['Pilas',8],['Papel de regalo',7]]],
['Algo que hacen los papás en las fiestas infantiles',[['Platicar',30],['Tomar',25],['Grabar con el celular',18],['Cuidar a los niños',15],['Comer',8]]],
['Algo que haces en un domingo',[['Descansar',35],['Comer en familia',25],['Ver futbol',15],['Ir a misa',12],['Lavar la ropa',8]]],
['Algo que haces cuando tienes hipo',[['Tomar agua',40],['Aguantar la respiración',25],['Que te asusten',18],['Comer azúcar',8],['Contar',5]]],
['Un animal que no quisieras de mascota',[['Una serpiente',35],['Una rata',22],['Una araña',18],['Un cocodrilo',12],['Un zorrillo',8]]],
['Algo que haces en tu primer día de trabajo',[['Presentarte',30],['Llegar temprano',25],['Ponerte nervioso',18],['Llenar papeles',12],['Conocer la oficina',10]]],
['Algo que se te olvida en el súper',[['Las bolsas',30],['La lista',25],['Lo que ibas a comprar',22],['El papel de baño',12],['La cartera',8]]],
['Algo que hacen los niños el 24 en la noche',[['No dormirse',30],['Esperar a Santa',25],['Jugar',18],['Echar cohetes',12],['Comer dulces',10]]],
['Algo que te molesta de tu vecino',[['El ruido',40],['La música',22],['Que es chismoso',15],['Su perro',12],['Que se estaciona en tu lugar',8]]],
['Algo que se pide en una taquería',[['Pastor',38],['Suadero',20],['Campechanos',15],['Bistec',12],['Gringas',10]]],
['Algo que haces cuando vas a la playa',[['Nadar',30],['Asolearte',25],['Comer mariscos',18],['Tomar',15],['Hacer castillos de arena',8]]],
['Algo que haces cuando se va la luz',[['Prender velas',35],['Usar la lámpara del celular',25],['Dormir',18],['Quejarte',12],['Contar historias',5]]],
['Algo que dices cuando no quieres ir a una fiesta',[['Estoy cansado',30],['Ya tengo planes',25],['Me siento mal',20],['No tengo dinero',12],['Luego les caigo',8]]],
['Algo que se pone en el árbol de Navidad',[['Esferas',35],['Luces',28],['Estrella',15],['Escarcha',10],['Muñequitos',7]]],
['Algo que la gente guarda "para una ocasión especial"',[['La vajilla buena',35],['Ropa nueva',22],['Una botella',18],['Perfume',12],['Los zapatos buenos',8]]],
['Algo que hay en una oficina',[['Computadoras',30],['Escritorios',22],['Cafetera',18],['Impresora',15],['Un jefe enojón',10]]],
['Algo que haces antes de dormir',[['Ver el celular',35],['Lavarte los dientes',25],['Rezar',15],['Ponerte la pijama',12],['Ver la tele',8]]],
['Algo que pasa cuando le pegas a la piñata',[['Cantan «Dale, dale, dale»',30],['Te marean',25],['Le das a alguien',18],['Todos se avientan por los dulces',15],['No le atinas',8]]],
['Un lugar donde la gente se va en vacaciones de diciembre',[['La playa',38],['El pueblo de los papás',22],['Estados Unidos',14],['Una cabaña',10],['Disney',8]]],
['Algo que se quema en Navidad',[['La cena',30],['Las velas',22],['Los cohetes',18],['Las series de luces',12],['Las galletas',10]]]
],

// ---------- Jeopardy ----------
// Cada ronda: [[categoría, [[pista, respuesta] x5]], ...]
jeopardy: [
[
['Los 80 y 90',[['Mascota virtual en forma de huevo que se te moría si no le dabas de comer','Tamagotchi'],['Grupo infantil donde empezaron Thalía y Paulina Rubio','Timbiriche'],['Consola de Nintendo de 1996 con un control de tres agarraderas','Nintendo 64'],['Seis amigos de Nueva York que vivían en el café Central Perk','Friends'],['Año del Mundial en México con la mascota Pique','1986']]],
['Películas de todas las épocas',[['En 1997 Jack y Rose no cupieron en la misma puerta','Titanic'],['Película de Iñárritu de 2000 con historias cruzadas y muchos perros','Amores perros'],['Película de Pixar de 1995, la primera hecha toda en computadora','Toy Story'],['Director mexicano que ganó el Óscar en 2018 por «La forma del agua»','Guillermo del Toro'],['Neo tiene que escoger entre la pastilla roja y la azul','Matrix']]],
['Ingeniería para no ingenieros',[['Ley que dice que si algo puede salir mal, va a salir mal','Ley de Murphy'],['Unidad de la resistencia eléctrica','Ohm'],['En 1947 encontraron el primer «bug» de verdad dentro de una computadora. ¿Qué bicho era?','Una polilla'],['Unidad de potencia nombrada por el escocés que mejoró la máquina de vapor','Watt'],['Prefijo que significa 10 a la 12','Tera']]],
['Economía de quincena',[['La ley más famosa de la economía: la de la oferta y…','La demanda'],['El banco central de México','Banxico'],['Economista escocés de la «mano invisible»','Adam Smith'],['Cuando el PIB cae dos trimestres seguidos, se le suele llamar…','Recesión técnica'],['Índice de The Economist que compara el precio de una hamburguesa en varios países','Índice Big Mac']]],
['Marketing y marcas',[['Marca del eslogan «Just Do It»','Nike'],['Animal de la mascota de Zucaritas','Un tigre'],['Las 4 P del marketing: producto, precio, plaza y…','Promoción'],['Empresa mexicana fundada en 1945 con un osito blanco de mascota','Bimbo'],['Lanzamiento de 1985 en que Coca-Cola cambió su fórmula y tuvo que dar marcha atrás','New Coke']]],
['En el diván',[['Padre del psicoanálisis','Sigmund Freud'],['Psicólogo de la pirámide de necesidades','Abraham Maslow'],['Científico ruso cuyo perro salivaba al oír un sonido','Iván Pávlov'],['Efecto por el que los que menos saben creen que saben más','Efecto Dunning-Kruger'],['Experimento de 1971 con estudiantes haciendo de presos y guardias','Experimento de la cárcel de Stanford']]]
],
[
['Tele mexicana',[['Pobre pero honrada, y con un perro llamado Pulgoso','Marimar'],['Programa de Chespirito que pasaba en una vecindad','El Chavo del 8'],['La villana de «María la del Barrio», experta en gritar desde las escaleras','Soraya Montenegro'],['Conductor histórico de «Siempre en domingo»','Raúl Velasco'],['Llega con flores para Doña Florinda y se queda a tomar una tacita de café','El Profesor Jirafales']]],
['Internet y memes',[['Raza del perro del meme «Doge»','Shiba Inu'],['Juego de 2016 que nos sacó a la calle a cazar criaturas con el celular','Pokémon Go'],['El primer video de YouTube en llegar a mil millones de vistas, con baile de caballito','Gangnam Style'],['Cantante con el que te hacen un «Rickroll»','Rick Astley'],['Año en que se subió a YouTube el primer video, «Me at the zoo»','2005']]],
['Música que nos da pena admitir',[['Dúo español de la «Macarena»','Los del Río'],['Cantante que tiró indirectas a Piqué en la Session #53 de Bizarrap','Shakira'],['Boy band de Justin Timberlake que cantaba «Bye Bye Bye»','*NSYNC'],['Trío de Mexicali que nos hizo llorar con «Yo quisiera»','Reik'],['Rapero de «Ice Ice Baby», acusado de tomar prestado el bajo de «Under Pressure»','Vanilla Ice']]],
['Navidad sin filtro',[['Lo que se come del 25 al 28 de diciembre','El recalentado'],['Fiesta de oficina donde pasa «Duro de matar»','Una fiesta de Navidad'],['Canción de Mariah Carey que vuelve al número 1 casi cada diciembre','All I Want for Christmas Is You'],['Región de España donde un tronco llamado Caga Tió «suelta» regalos','Cataluña'],['Mínimo de días de salario que debe dar el aguinaldo por ley en México','15 días']]]
]
],
jeopardyFinal: ['Navidad','Este villancico se cantó por primera vez en 1818 en una iglesia de Oberndorf, Austria','Noche de paz'],

// ---------- Atínale al precio ----------
// id (nombre de la imagen en /productos), nombre, dónde, precio en pesos
products: [
['montblanc','Pluma roller Montblanc Meisterstück Classique','El Palacio de Hierro',12600],
['dyson','Estilizador Dyson Airwrap i.d. (precio de lista)','Dyson México',15499],
['iphone','iPhone 17 de 256 GB','Tienda de Apple México',21999],
['ps5','PlayStation 5, edición estándar','Costco',12499],
['stanley','Termo Stanley Quencher H2.0 de 40 oz','Bodega Aurrera',550],
['rosca','Rosca de Reyes tradicional de 2 kg','Costco',429],
['bacalao','Un kilo de bacalao','El súper, en diciembre',389],
['cine','Un boleto de cine en sala tradicional','Cinépolis',102],
['pavo','Un kilo de pavo natural','Promedio de Profeco',99],
['aguacate','Un kilo de aguacate Hass','Promedio nacional de Profeco',47],
['taco','Un taco al pastor','Los Cocuyos, en el Centro',22],
['gasolina','Un litro de gasolina regular','Promedio nacional, noviembre 2026',24],
['metro','Un boleto del Metro','Metro de la CDMX',5],
['salario','Un día de salario mínimo (2025)','Lo que marca la ley',249],
['rompope','Un litro de rompope','Promedio de Profeco',153]
],

// ---------- Basta ----------
bastaCategories: ['Nombre','Apellido','Ciudad o país','Flor o fruto','Animal','Marca','Cultura pop','Cualquier cosa'],
bastaLetters: 'ABCDEFGIJLMNOPRSTV'.split(''),

// ---------- ¿Quién quiere ser millonario? ----------
// 5 niveles; en cada nivel varias preguntas: [pregunta, [A,B,C,D], índice correcto]
millionaire: [
[['¿De qué color es la nariz de Rodolfo el reno?',['Azul','Roja','Verde','Dorada'],1],['¿Qué se rompe en las posadas?',['La piñata','Las esferas','El nacimiento','Las velas'],0],['¿Cuántas uvas se comen en Año Nuevo?',['10','12','7','24'],1],['¿Cómo se llama el muñeco de nieve de «Frozen»?',['Olaf','Sven','Hans','Kristoff'],0]],
[['¿De qué país es originaria la flor de nochebuena?',['España','Brasil','México','Italia'],2],['¿Cómo se llama el niño de «Mi pobre angelito»?',['Kevin','Kyle','Buddy','Charlie'],0],['¿Qué se come el 2 de febrero?',['Tamales','Bacalao','Pozole','Romeritos'],0],['¿Qué personaje de Dickens odia la Navidad?',['Oliver Twist','Ebenezer Scrooge','David Copperfield','Tiny Tim'],1]],
[['¿Cuántas posadas se celebran?',['7','9','12','5'],1],['¿Quién canta «All I Want for Christmas Is You»?',['Mariah Carey','Celine Dion','Whitney Houston','Christina Aguilera'],0],['¿Qué país regala cada año el árbol de Navidad de Trafalgar Square en Londres?',['Suecia','Noruega','Finlandia','Dinamarca'],1],['¿Quién escribió «Cuento de Navidad»?',['Mark Twain','Charles Dickens','Oscar Wilde','Jane Austen'],1]],
[['¿Quién compuso la música de «El cascanueces»?',['Mozart','Chaikovski','Beethoven','Vivaldi'],1],['¿Qué ciudad celebra la Noche de Rábanos el 23 de diciembre?',['Puebla','Oaxaca','Morelia','Mérida'],1],['¿En qué año se estrenó «Mi pobre angelito»?',['1988','1990','1992','1995'],1],['¿En qué país es tradición cenar KFC en Navidad?',['Corea del Sur','China','Japón','Filipinas'],2]],
[['¿Cuántos regalos en total se dan en la canción «Los doce días de Navidad»?',['78','144','364','365'],2],['¿En qué año se publicó «Cuento de Navidad» de Dickens?',['1812','1843','1865','1901'],1],['¿Qué diplomático llevó la nochebuena a Estados Unidos y le dio su nombre en inglés?',['Joel Poinsett','John Adams','Thomas Jefferson','Benjamin Franklin'],0],['Según la tradición, ¿en qué lugar se celebraron las primeras posadas?',['Taxco','Acolman','Cholula','Querétaro'],1]]
],
ladder: [1,2,3,5,8],

ornaments: ['esfera-luna','esfera-fresa','esfera-pez','esfera-reloj','esfera-cara','esfera-campana','esfera-flor','esfera-tetera','esfera-pina','esfera-hongo','esfera-medallon','esfera-campana-reloj'],

robRules: ['Roba el regalo de quien quieras','Roba el regalo de quien quieras','Cambia tu regalo con el de tu izquierda','Todos pasan su regalo a la derecha','Te quedas como estás','¡Blindado! Nadie te roba en la siguiente vuelta']
};
