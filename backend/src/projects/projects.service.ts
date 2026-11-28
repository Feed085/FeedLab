import {
  Injectable,
  OnModuleInit,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import { Project, ProjectDocument, BOMComponent } from './schemas/project.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { Technology, TechnologyDocument } from '../categories/schemas/technology.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Component, ComponentDocument } from '../components/schemas/component.schema';
import { QueryProjectsDto } from './dto/query-projects.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ReviewProjectDto } from './dto/review-project.dto';
import { MatchComponentsDto } from './dto/match-components.dto';
import { LocalStorageService } from '../storage/local-storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AZERBAIJANI_ERROR_MESSAGES } from '../common/i18n/az.messages';
import {
  buildComponentLookup,
  doesBomMatchSelection,
  escapeRegex,
  resolveBomCanonicalKey,
  resolveSelectedComponents,
  resolveTokenToSlug,
} from '../components/component-matcher.util';

@Injectable()
export class ProjectsService implements OnModuleInit {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @InjectModel(Project.name) private readonly projectModel: Model<ProjectDocument>,
    @InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Technology.name) private readonly technologyModel: Model<TechnologyDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly storageService: LocalStorageService,
    private readonly notificationsService: NotificationsService,
    @Optional() @InjectModel(Component.name) private readonly componentModel?: Model<ComponentDocument>,
  ) {}

  async onModuleInit() {
    await this.seedProjects();
  }

  async seedProjects() {
    try {
      // Find author or admin user for project authorId
      let author = await this.userModel.findOne({ role: 'AUTHOR' });
      if (!author) {
        author = await this.userModel.findOne({ role: 'ADMIN' });
      }
      if (!author) {
        // If neither exists yet, find any user
        author = await this.userModel.findOne({});
      }
      if (!author) {
        this.logger.warn('No user found to associate seeded projects with. Skipping project seed.');
        return;
      }

      // Find categories
      let electronicsCat = await this.categoryModel.findOne({ slug: 'electronics-iot' });
      if (!electronicsCat) {
        electronicsCat = await this.categoryModel.create({
          name: 'Elektronika & IoT',
          slug: 'electronics-iot',
          description: 'Mikrokontrollerlər, sensorlar və IoT sistemləri',
          icon: 'Cpu',
          displayOrder: 1,
        });
      }
      const sensorsCat = await this.categoryModel.findOne({ slug: 'sensors' });
      const smartHomeCat = await this.categoryModel.findOne({ slug: 'smart-home' });
      const roboticsCat = await this.categoryModel.findOne({ slug: 'robotics' });
      const schematicsCat = await this.categoryModel.findOne({ slug: 'schematics' });

      // Find technologies
      const arduinoTech = await this.technologyModel.findOne({ slug: 'arduino' });
      const esp32Tech = await this.technologyModel.findOne({ slug: 'esp32' });
      const rpiTech = await this.technologyModel.findOne({ slug: 'raspberry-pi' });
      const stm32Tech = await this.technologyModel.findOne({ slug: 'stm32' });
      const mqttTech = await this.technologyModel.findOne({ slug: 'mqtt' });
      const zigbeeTech = await this.technologyModel.findOne({ slug: 'zigbee' });
      const cCppTech = await this.technologyModel.findOne({ slug: 'c-cpp' });
      const pythonTech = await this.technologyModel.findOne({ slug: 'python' });

      const sampleProjects = [
        {
          title: 'Arduino Əsaslı Ağıllı Hava Stansiyası və Ətraf Mühit Monitorinqi',
          slug: 'agilli-hava-stansiyasi-arduino',
          price: 15.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          technologies: [arduinoTech?._id, cCppTech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: true,
          domains: ['Ekologiya', 'Kompüter mühəndisliyi'],
          difficulty: 'BEGINNER',
          rating: 4.9,
          salesCount: 28,
          viewsCount: 210,
          shortDescription:
            'Arduino Uno və DHT22, BMP280 sensorları ilə real vaxt temperatur, rütubət və atmosfer təzyiqinin ölçülməsi sistemi.',
          fullDescription:
            'Bu layihə açıq havada və ya qapalı laboratoriyalarda mikroiqlim parametrlərini real vaxt rejimində dəqiqliklə ölçmək üçün nəzərdə tutulmuşdur. Vahid lövhə üzərində rəqəmsal sensorlar birləşdirilmiş və I2C rabitə interfeysi vasitəsilə LCD ekranda canlı indikasiya təmin edilmişdir.',
          objectives: [
            'Real vaxt rejimində ətraf mühitin temperatur və rütubət göstəricilərinin toplanması',
            'Atmosfer təzyiqi və dəniz səviyyəsindən hündürlüyün dəqiq hesablanması',
            'Məlumatların I2C 16x2 LCD ekranında və UART serial portunda canlı əks etdirilməsi',
          ],
          workingPrinciple:
            'Sistem DHT22 sensoru vasitəsilə vahid rəqəmsal xətt üzərindən nisbi rütubət və temperaturu, BMP280 sensoru vasitəsilə isə I2C protokolu ilə barometrik təzyiqi oxuyur. Arduino mikrokontrolleri verilənləri süzgəcdən keçirir və ekrana ötürür.',
          components: [
            {
              name: 'Arduino Uno R3 (ATmega328P)',
              quantity: 1,
              estimatedCostAzn: 12.0,
              notes: 'DIP mikrokontroller',
              componentSlug: 'arduino-uno',
            },
            {
              name: 'DHT22 (AM2302) Rütubət və Temperatur Sensoru',
              quantity: 1,
              estimatedCostAzn: 8.5,
              notes: 'Dəqiqlik: +-2% RH',
              componentSlug: 'dht22',
            },
            {
              name: 'BMP280 Barometrik Təzyiq Sensoru',
              quantity: 1,
              estimatedCostAzn: 4.5,
              notes: 'I2C ünvanı 0x76',
              componentSlug: 'bmp280',
            },
            {
              name: '16x2 LCD Ekran I2C Modulu ilə',
              quantity: 1,
              estimatedCostAzn: 6.0,
              notes: 'PC8574 adapter',
              componentSlug: 'lcd-16x2-i2c',
            },
            {
              name: 'MB-102 Breadboard və Jumper Tellər',
              quantity: 1,
              estimatedCostAzn: 5.0,
              notes: 'Tam montaj dəsti',
              componentSlug: 'breadboard-jumper',
            },
          ],
          installationGuide:
            '1. Arduino IDE 2.x quraşdırın.\n2. Adafruit_BMP280 və DHT sensor kitabxanalarını əlavə edin.\n3. Sxemə uyğun olaraq SDA və SCL xətlərini A4 və A5 pinlərinə birləşdirin.\n4. Layihənin .ino faylını lövhəyə yükləyin.',
          hardwareRequirements:
            '5V 1A USB qida mənbəyi, lehimləmə avadanlığı (könüllü), USB Type-B kabeli.',
          systemRequirements: 'Arduino IDE 2.0+, Windows/Linux/macOS dəstəyi.',
          publicFiles: [
            {
              fileId: 'file-ws-01',
              originalName: 'schematic_weather_station.pdf',
              fileSize: 1258291,
              fileType: 'application/pdf',
              isPreview: true,
            },
            {
              fileId: 'file-ws-02',
              originalName: 'wiring_diagram_fritzing.png',
              fileSize: 870400,
              fileType: 'image/png',
              isPreview: true,
            },
          ],
        },
        {
          title: 'ESP32 Sənaye IoT Telemetriya və Rele İdarəetmə Düyünü',
          slug: 'esp32-senaye-iot-telemetriya',
          price: 25.0,
          currency: 'AZN',
          categoryId: smartHomeCat?._id || new Types.ObjectId(),
          technologies: [esp32Tech?._id, mqttTech?._id, cCppTech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: true,
          domains: ['İT', 'Energetika'],
          difficulty: 'INTERMEDIATE',
          thumbnailUrl: '/images/hero-esp32.jpg',
          images: ['/images/hero-esp32.jpg'],
          rating: 4.8,
          salesCount: 45,
          viewsCount: 380,
          shortDescription:
            'Wi-Fi və MQTT protokolu üzərindən sənaye sensor məlumatlarının toplanması, rele idarəetməsi və təhlükəsiz TLS rabitəsi.',
          fullDescription:
            'ESP32 əsaslı bu telemetriya düyünü sənaye mühitində quraşdırılmış sensorların göstəricilərini mərkəzi MQTT brokerə ötürür və daxil olan əmrlərə əsasən 4 ədəd güc relesini idarə edir. Qəza vəziyyətlərində avtonom təhlükəsizlik rejiminə keçir.',
          objectives: [
            'Yüksək etibarlı TLS şifrələməsi ilə MQTT telemetriya rabitəsi',
            '4 müstəqil elektrik dövrəsinin təhlükəsiz optik təcridlə açılıb-bağlanması',
            'Watchdog timer ilə fasiləsiz 24/7 işləmə qabiliyyəti',
          ],
          workingPrinciple:
            'ESP32 Wi-Fi vasitəsilə yerli şəbəkəyə qoşulur və təyin olunmuş MQTT mövzularına abunə olur. Hər 5 saniyədən bir sensor göstəriciləri JSON formatında brokerə göndərilir.',
          components: [
            {
              name: 'ESP32-WROOM-32D İnkişaf Lövhəsi',
              quantity: 1,
              estimatedCostAzn: 14.0,
              notes: 'İki nüvəli 240MHz MCU',
              componentSlug: 'esp32',
            },
            {
              name: '4-Kanallı Optocütləşdiricili 5V Rele Modulu',
              quantity: 1,
              estimatedCostAzn: 7.5,
              notes: '10A 250VAC yük həddi',
              componentSlug: 'relay-module',
            },
            {
              name: 'DS18B20 Paslanmayan Polad İstilik Sensoru',
              quantity: 2,
              estimatedCostAzn: 9.0,
              notes: 'OneWire interfeysi',
              componentSlug: 'ds18b20',
            },
            {
              name: 'Mean Well 5V 2A Din-Rail Qida Bloku',
              quantity: 1,
              estimatedCostAzn: 18.0,
              notes: 'Sənaye qida təchizatı',
              componentSlug: 'power-supply-5v',
            },
          ],
          installationGuide:
            '1. PlatformIO mühitini açın.\n2. config.h faylında Wi-Fi SSID və MQTT broker parametrlərini tənzimləyin.\n3. ESP32-ni flaş edin və MQTT abunəliyini yoxlayın.',
          hardwareRequirements: '220V AC / 5V DC qida bloku, montaj paneli.',
          systemRequirements: 'VS Code, PlatformIO Core 6.0+, Mosquitto MQTT Broker.',
          publicFiles: [
            {
              fileId: 'file-iot-01',
              originalName: 'esp32_telemetry_schematics.pdf',
              fileSize: 2450000,
              fileType: 'application/pdf',
              isPreview: true,
            },
          ],
        },
        {
          title: 'Raspberry Pi 4 ilə Görüntü Emalı Edən Ağıllı Robot Platforması',
          slug: 'raspberry-pi-goruntu-emali-robot',
          price: 45.0,
          currency: 'AZN',
          categoryId: roboticsCat?._id || new Types.ObjectId(),
          technologies: [rpiTech?._id, pythonTech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: true,
          domains: ['Kompüter mühəndisliyi', 'İT'],
          difficulty: 'ADVANCED',
          rating: 5.0,
          salesCount: 19,
          viewsCount: 520,
          shortDescription:
            'OpenCV və Raspberry Pi Camera ilə xətt izləyən, maneələrdən qaçan və real vaxtda yol nişanlarını tanıyan 4WD avtonom robot platforması.',
          fullDescription:
            'Bu avtonom robot platforması daxili kompüter görməsi (computer vision) alqoritmləri sayəsində ətraf mühiti analiz edir, maneələri təyin edir və optimal hərəkət trayektoriyasını seçir.',
          objectives: [
            'Kamera vasitəsilə 30 FPS tezliklə video axınının işlənməsi',
            'OpenCV rəng və kontur filtrləri ilə zolaq və nişan təyini',
            'PID tənzimləyici ilə dəqiq motor sürət idarəetməsi',
          ],
          workingPrinciple:
            'Kamera görüntüləri Python OpenCV skriptinə ötürülür. Təsvir emal edildikdən sonra sükan bucağı və sürət hesablanır, GPIO vasitəsilə L298N motor sürücüsünə PWM siqnalları göndərilir.',
          components: [
            {
              name: 'Raspberry Pi 4 Model B (4GB RAM)',
              quantity: 1,
              estimatedCostAzn: 120.0,
              notes: 'Əsas hesablama vahidi',
              componentSlug: 'raspberry-pi-4',
            },
            {
              name: 'Raspberry Pi Camera Module V2',
              quantity: 1,
              estimatedCostAzn: 45.0,
              notes: '8MP Sony IMX219 sensor',
              componentSlug: 'rpi-camera-v2',
            },
            {
              name: 'L298N İkiqat H-Körpülü DC Motor Sürücüsü',
              quantity: 1,
              estimatedCostAzn: 6.5,
              notes: '2A pik cərəyan',
              componentSlug: 'l298n',
            },
            {
              name: '4WD Alüminium Robot Şassi Dəsti',
              quantity: 1,
              estimatedCostAzn: 35.0,
              notes: '4 ədəd DC reduktorlu motor ilə',
              componentSlug: 'robot-chassis-4wd',
            },
            {
              name: '2x 18650 Li-ion Batareya və BMS Qoruma Lövhəsi',
              quantity: 1,
              estimatedCostAzn: 16.0,
              notes: '7.4V nominal gərginlik',
              componentSlug: 'battery-18650-bms',
            },
          ],
          installationGuide:
            '1. Raspberry Pi OS Lite quraşdırın.\n2. OpenCV və picamera2 kitabxanalarını quraşdırın.\n3. Python idarəetmə skriptini systemd xidməti kimi sazlayın.\n4. Robotu yerə qoyub kalibrasiyanı başladın.',
          hardwareRequirements: '7.4V Li-ion batareya dəsti, 5V 3A step-down çevirici.',
          systemRequirements: 'Raspberry Pi OS (64-bit), Python 3.10+, OpenCV 4.x.',
          publicFiles: [
            {
              fileId: 'file-rob-01',
              originalName: 'robot_assembly_guide.pdf',
              fileSize: 5340000,
              fileType: 'application/pdf',
              isPreview: true,
            },
          ],
        },
        {
          title: 'Ağıllı Ev İdarəetmə Mərkəzi və Zigbee/MQTT Şlüzü',
          slug: 'agilli-ev-merkezi-zigbee-mqtt',
          price: 35.0,
          currency: 'AZN',
          categoryId: smartHomeCat?._id || new Types.ObjectId(),
          technologies: [esp32Tech?._id, zigbeeTech?._id, mqttTech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: false,
          domains: ['İT', 'İnformasiya təhlükəsizliyi'],
          difficulty: 'INTERMEDIATE',
          rating: 4.7,
          salesCount: 32,
          viewsCount: 290,
          shortDescription:
            'Home Assistant və Node-RED inteqrasiyalı, bütün mənzil sensorlarını mərkəzləşdirən yerli IoT şlüz server həlli.',
          fullDescription:
            'Mənzildə olan bütün Zigbee və Wi-Fi sensorlarını vahid şəbəkədə birləşdirən universal şlüz layihəsi. Məlumatları buluda ehtiyac olmadan yerli serverdə saxlayır.',
          objectives: [
            'Zigbee sensorlarının koordinasiyası və yerli brokerlə əlaqələndirilməsi',
            'OLED ekranda qapı, pəncərə və temperatur statuslarının göstərilməsi',
            'Təhlükəsizlik rejimində xəbərdarlıq siqnalının aktivləşməsi',
          ],
          workingPrinciple:
            'CC2530 modulu simsiz Zigbee paketlərini qəbul edərək UART vasitəsilə ESP32-yə ötürür. ESP32 paketləri dekod edərək MQTT üzərindən yerli Home Assistant platformasına yönləndirir.',
          components: [
            {
              name: 'ESP32-S3 WROOM Lövhəsi',
              quantity: 1,
              estimatedCostAzn: 16.0,
              notes: 'Yerli Wi-Fi və Bluetooth',
              componentSlug: 'esp32',
            },
            {
              name: 'CC2530 Zigbee Simsiz Transceiver Modulu',
              quantity: 1,
              estimatedCostAzn: 12.0,
              notes: 'Koordinatör proqram təminatı ilə',
              componentSlug: 'cc2530-zigbee',
            },
            {
              name: 'BME680 Qaz və Hava Keyfiyyəti Sensoru',
              quantity: 1,
              estimatedCostAzn: 24.0,
              notes: 'VOC, rütubət, təzyiq',
              componentSlug: 'bme680',
            },
            {
              name: '0.96 düym I2C OLED Ekran',
              quantity: 1,
              estimatedCostAzn: 5.5,
              notes: 'SSD1306 128x64 ağ ekran',
              componentSlug: 'oled-ssd1306',
            },
          ],
          installationGuide:
            '1. ESP32 firmware-ni yükləyin.\n2. Zigbee qoşulma rejimini düymə ilə aktiv edin.\n3. Sensorları cütləşdirin və Home Assistant-da avtomatik kəşf edin.',
          hardwareRequirements: '5V 2A micro-USB qida bloku.',
          systemRequirements: 'Home Assistant OS və ya Docker mühiti.',
          publicFiles: [
            {
              fileId: 'file-gw-01',
              originalName: 'gateway_circuit_diagram.pdf',
              fileSize: 1800000,
              fileType: 'application/pdf',
              isPreview: true,
            },
          ],
        },
        {
          title: 'STM32 ilə İkikanallı Rəqəmsal Osilloqraf və Siqnal Generatoru',
          slug: 'stm32-ikikanalli-reqemsal-osilloqraf',
          price: 20.0,
          currency: 'AZN',
          categoryId: schematicsCat?._id || new Types.ObjectId(),
          technologies: [stm32Tech?._id, cCppTech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: false,
          domains: ['Kompüter mühəndisliyi', 'Energetika'],
          difficulty: 'ADVANCED',
          rating: 4.6,
          salesCount: 12,
          viewsCount: 180,
          shortDescription:
            'STM32F401 BlackPill və 2.8 düym SPI TFT sensor ekran üzərində qurulmuş 1MSPS seçmə tezlikli portativ laboratoriya ölçü cihazı.',
          fullDescription:
            'Tələbələr və elektronika mühəndisləri üçün cib osilloqrafı və PWM siqnal generatoru. İki analoq kanalı eyni vaxtda qrafik olaraq əks etdirir.',
          objectives: [
            '1MSPS daxili ADC ilə 500kHz-ə qədər siqnalların analizi',
            'Sinus, düzbucaqlı və üçbucaq dalğa formalarının generasiyası',
            'Trigger rejimləri (Auto, Normal, Single) və gərginlik ölçüləri',
          ],
          workingPrinciple:
            'STM32 daxili DMA kanalından istifadə edərək ADC buferini fasiləsiz doldurur. Hesablanmış dalğa forması SPI interfeysi vasitəsilə TFT ekrana çəkilir.',
          components: [
            {
              name: 'STM32F401CCU6 BlackPill Lövhəsi',
              quantity: 1,
              estimatedCostAzn: 11.0,
              notes: '84MHz Cortex-M4 MCU',
              componentSlug: 'stm32f4',
            },
            {
              name: '2.8 düym TFT SPI 240x320 Ekran ILI9341',
              quantity: 1,
              estimatedCostAzn: 17.0,
              notes: 'Sensorlu idarəetmə paneli',
              componentSlug: 'tft-ili9341',
            },
            {
              name: 'TL072CP Aşağı Səs-küylü İkiqat Op-Amp',
              quantity: 2,
              estimatedCostAzn: 3.0,
              notes: 'Giriş zəiflədici dövrəsi',
              componentSlug: 'tl072-opamp',
            },
            {
              name: 'Rotary Encoder EC11 Düyməli',
              quantity: 1,
              estimatedCostAzn: 2.5,
              notes: 'Menyu naviqasiyası üçün',
              componentSlug: 'rotary-encoder-ec11',
            },
          ],
          installationGuide:
            '1. STM32CubeIDE proqramında layihəni açın.\n2. ST-Link V2 proqramatoru ilə mikrokontrollerə yazın.\n3. Prob kalibrasiyasını 1kHz daxili test siqnalı ilə yerinə yetirin.',
          hardwareRequirements: 'ST-Link V2 proqramator, 1x/10x osilloqraf probu.',
          systemRequirements: 'STM32CubeIDE 1.14+, Windows/Linux.',
          publicFiles: [
            {
              fileId: 'file-osc-01',
              originalName: 'stm32_scope_pcb_gerber.zip',
              fileSize: 3100000,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          title: 'Avtonom Bitki Suvarma və Torpaq Rütubəti Tənzimləyicisi (Pulsuz Nümunə)',
          slug: 'avtonom-bitki-suvarma-ve-torpaq-rutubeti',
          price: 0.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          technologies: [arduinoTech?._id, cCppTech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: true,
          domains: ['Kənd təsərrüfatı', 'Ekologiya'],
          difficulty: 'BEGINNER',
          thumbnailUrl: '/images/project-plant-watering.jpg',
          images: ['/images/project-plant-watering.jpg'],
          rating: 4.9,
          salesCount: 142,
          viewsCount: 950,
          shortDescription:
            'Arduino Nano və tutumlu torpaq rütubət sensoru ilə otaq bitkiləri üçün avtomatik mini suvarma sistemi. Tam açıq mənbəli pulsuz başlanğıc layihəsi.',
          fullDescription:
            'Bu layihə otaq və istixana bitkilərinin torpaq rütubətini fasiləsiz ölçür və torpaq quruduqda su nasosunu avtomatik işə salır. Korroziyaya davamlı kapasitiv sensor istifadə edildiyi üçün uzunömürlüdür.',
          objectives: [
            'Torpaq rütubətinin korroziyaya davamlı sensorla fasiləsiz izlənməsi',
            'Rütubət kritik həddən aşağı düşdükdə 5V su nasosunun avtomatik aktivləşdirilməsi',
            'Su çənində maye səviyyəsinin yoxlanması və nasosun quru işləməsinin qarşısının alınması',
          ],
          workingPrinciple:
            'Kapasitiv (tutumlu) sensor torpağın dielektrik sabitini ölçərək korroziyasız dəqiq analoq gərginlik hasil edir. Arduino Nano bu qiyməti oxuyaraq kalibrlənmiş faiz göstəricisinə çevirir. Əgər rütubət 30%-dən aşağı düşərsə, tranzistorlu rele dövrəsi işə düşür və 5 saniyə ərzində torpağa su vurulur.',
          components: [
            {
              name: 'Arduino Nano V3 (ATmega328P CH340)',
              quantity: 1,
              estimatedCostAzn: 7.0,
              notes: 'Mini kontroller lövhəsi',
              componentSlug: 'arduino-nano',
            },
            {
              name: 'Tutumlu Torpaq Rütubəti Sensoru v1.2',
              quantity: 1,
              estimatedCostAzn: 3.5,
              notes: 'Korroziyaya qarşı davamlı',
              componentSlug: 'soil-moisture-sensor',
            },
            {
              name: '5V DC Mini Daldırma Su Nasosu və 1m Silikon Şlanq',
              quantity: 1,
              estimatedCostAzn: 5.0,
              notes: '120L/saat axın sürəti',
              componentSlug: 'dc-water-pump-5v',
            },
            {
              name: '1-Kanallı 5V Optocütləşdiricili Rele Modulu',
              quantity: 1,
              estimatedCostAzn: 2.5,
              notes: 'Nasos idarəetməsi üçün',
              componentSlug: 'relay-module',
            },
            {
              name: '5V 2A Şəbəkə Qida Adaptoru',
              quantity: 1,
              estimatedCostAzn: 6.0,
              notes: 'Elektrik şəbəkəsi qidası',
              componentSlug: 'power-supply-5v',
            },
          ],
          installationGuide:
            '1. Arduino Nano lövhəsini USB ilə kompüterə qoşun.\n2. SoilMoisture.ino eskizini yükləyin.\n3. Quru və nəm torpaqda analoq dəyərləri Serial Monitor vasitəsilə qeyd edib hədləri tənzimləyin.\n4. Nasos şlanqını dibçəyə yerləşdirin.',
          hardwareRequirements: '5V 2A USB enerji mənbəyi, su qabı və silikon boru.',
          systemRequirements: 'Arduino IDE 1.8+ və ya 2.0+, Windows/macOS/Linux.',
          publicFiles: [
            {
              fileId: 'file-soil-01',
              originalName: 'bitki_suvarma_sxem.pdf',
              fileSize: 1100000,
              fileType: 'application/pdf',
              isPreview: true,
            },
            {
              fileId: 'file-soil-02',
              originalName: 'arduino_nano_kod_tam.ino',
              fileSize: 15360,
              fileType: 'text/plain',
              isPreview: true,
            },
          ],
        },
        // Scenario & Tier 1 Fixture projects
        {
          customId: '64b1f8e123456789proj0002',
          title: 'ESP32 Ağıllı Ev İdarəetmə Paneli',
          slug: 'esp32-agilli-ev-idarəetmə-paneli',
          price: 45.0,
          currency: 'AZN',
          categoryId: electronicsCat?._id || smartHomeCat?._id || new Types.ObjectId(),
          technologies: [esp32Tech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: true,
          domains: ['İT', 'Energetika'],
          difficulty: 'INTERMEDIATE',
          thumbnailUrl: '/images/hero-esp32.jpg',
          images: ['/images/hero-esp32.jpg'],
          rating: 4.8,
          salesCount: 42,
          viewsCount: 350,
          shortDescription: 'ESP32 əsaslı sensor və idarəetmə mərkəzi',
          fullDescription: 'ESP32 əsaslı tam təchizatlı ağıllı ev idarəetmə paneli layihəsi.',
          objectives: ['Ağıllı ev idarəetməsi'],
          workingPrinciple: 'Wi-Fi və MQTT protokolu ilə idarəetmə.',
          components: [{ name: 'ESP32', quantity: 1, estimatedCostAzn: 15.0, notes: '', componentSlug: 'esp32' }],
          installationGuide: 'Firmware yükləyin və qoşun.',
          hardwareRequirements: 'ESP32 lövhəsi',
          systemRequirements: 'Arduino IDE',
          publicFiles: [
            {
              fileId: '64b1f8e123456789file0002',
              _id: '64b1f8e123456789file0002',
              originalName: 'esp32_smart_panel.zip',
              fileSize: 2048000,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b1f8e123456789proj0003',
          title: 'Arduino Hava Keyfiyyəti Stansiyası',
          slug: 'arduino-hava-keyfiyyəti-stansiyasi',
          price: 30.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          technologies: [arduinoTech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: true,
          domains: ['Ekologiya'],
          difficulty: 'BEGINNER',
          rating: 4.6,
          salesCount: 20,
          viewsCount: 180,
          shortDescription: 'Arduino sensor monitorinq stansiyası',
          fullDescription: 'Arduino Uno ilə havanın keyfiyyətini ölçən stansiya.',
          objectives: ['Hava keyfiyyətinin ölçülməsi'],
          workingPrinciple: 'Qaz və toz sensorlarının oxunması.',
          components: [{ name: 'Arduino Uno', quantity: 1, estimatedCostAzn: 10.0, notes: '', componentSlug: 'arduino-uno' }],
          installationGuide: 'Sensorları qoşun və skripti işə salın.',
          hardwareRequirements: 'Arduino Uno',
          systemRequirements: 'Arduino IDE',
          publicFiles: [
            {
              fileId: '64b1f8e123456789file0003',
              _id: '64b1f8e123456789file0003',
              originalName: 'arduino_weather.zip',
              fileSize: 1048000,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b1f8e123456789proj0004',
          title: 'IoT Telemetriya Sistemi',
          slug: 'iot-telemetriya-sistemi',
          price: 50.0,
          currency: 'AZN',
          categoryId: electronicsCat?._id || smartHomeCat?._id || new Types.ObjectId(),
          technologies: [esp32Tech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: false,
          domains: ['İT', 'Kompüter mühəndisliyi'],
          difficulty: 'INTERMEDIATE',
          rating: 4.5,
          salesCount: 15,
          viewsCount: 120,
          shortDescription: 'IoT əsaslı telemetriya məlumatlarının ötürülməsi',
          fullDescription: 'Uzaq məsafədən telemetriya toplanması və monitorinqi.',
          objectives: ['Məlumatların toplanması'],
          workingPrinciple: 'MQTT brokerinə telemetriya göndərilməsi.',
          components: [{ name: 'ESP32 Node', quantity: 1, estimatedCostAzn: 12.0, notes: '', componentSlug: 'esp32' }],
          installationGuide: 'WiFi parametrlərini daxil edin.',
          hardwareRequirements: 'ESP32',
          systemRequirements: 'PlatformIO',
          publicFiles: [
            {
              fileId: '64b1f8e123456789file0004',
              _id: '64b1f8e123456789file0004',
              originalName: 'telemetry_code.zip',
              fileSize: 1548000,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b1f8e123456789proj0006',
          title: 'ESP32 IoT Hava Keyfiyyəti Monitoru',
          slug: 'esp32-iot-hava-keyfiyyəti-monitoru',
          price: 35.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          technologies: [esp32Tech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: true,
          domains: ['Ekologiya', 'Səhiyyə'],
          difficulty: 'INTERMEDIATE',
          rating: 4.7,
          salesCount: 25,
          viewsCount: 220,
          shortDescription: 'ESP32 ilə real vaxt hava keyfiyyəti monitorinqi',
          fullDescription: 'Wi-Fi üzərindən hava keyfiyyətinin monitorinqi.',
          objectives: ['Real vaxt monitorinqi'],
          workingPrinciple: 'Sensor göstəricilərinin buluda ötürülməsi.',
          components: [{ name: 'MQ135', quantity: 1, estimatedCostAzn: 6.0, notes: '', componentSlug: 'mq135' }],
          installationGuide: 'Firmware quraşdırın.',
          hardwareRequirements: 'ESP32, MQ135',
          systemRequirements: 'Arduino IDE',
          publicFiles: [
            {
              fileId: '64b1f8e123456789file0006',
              _id: '64b1f8e123456789file0006',
              originalName: 'esp32_air_monitor.zip',
              fileSize: 3048000,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b1f8e123456789proj0008',
          title: 'Sənaye Avtomatlaşdırma Nəzarətçisi',
          slug: 'senaye-avtomatlasdirma-nezaretcisi',
          price: 60.0,
          currency: 'AZN',
          categoryId: roboticsCat?._id || new Types.ObjectId(),
          technologies: [stm32Tech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: false,
          domains: ['Energetika', 'Kompüter mühəndisliyi'],
          difficulty: 'ADVANCED',
          rating: 4.9,
          salesCount: 18,
          viewsCount: 160,
          shortDescription: 'STM32 əsaslı sənaye PLC nəzarət modulu',
          fullDescription: 'Sənaye avtomatlaşdırması üçün güclü nəzarətçi.',
          objectives: ['Avtomatlaşdırma'],
          workingPrinciple: 'Modbus RTU rabitəsi.',
          components: [{ name: 'STM32F4', quantity: 1, estimatedCostAzn: 20.0, notes: '', componentSlug: 'stm32f4' }],
          installationGuide: 'Montaj təlimatına baxın.',
          hardwareRequirements: '24V DC qida',
          systemRequirements: 'STM32CubeIDE',
          publicFiles: [
            {
              fileId: '64b1f8e123456789file0008',
              _id: '64b1f8e123456789file0008',
              originalName: 'industrial_controller.zip',
              fileSize: 4048000,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b1f8e123456789proj0009',
          title: 'Açıq Mənbəli Arduino LED Fləşer',
          slug: 'aciq-menbeli-arduino-led-flesher',
          price: 0.0,
          currency: 'AZN',
          categoryId: schematicsCat?._id || new Types.ObjectId(),
          technologies: [arduinoTech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: true,
          domains: ['Digər', 'Kompüter mühəndisliyi'],
          difficulty: 'BEGINNER',
          rating: 5.0,
          salesCount: 120,
          viewsCount: 800,
          shortDescription: 'Tam açıq mənbəli pulsuz IoT sxem və proqram təminatı',
          fullDescription: 'Hər kəs üçün pulsuz təqdim edilən başlanğıc IoT sxemi.',
          objectives: ['Təhsil və inkişaf'],
          workingPrinciple: 'Açıq mənbəli dövrə montajı.',
          components: [
            { name: 'Arduino Uno', quantity: 1, estimatedCostAzn: 7.0, notes: '', componentSlug: 'arduino-uno' },
            { name: '5mm Qırmızı LED', quantity: 1, estimatedCostAzn: 0.5, notes: '', componentSlug: 'led' },
            { name: '220 Ohm Rezistor', quantity: 1, estimatedCostAzn: 0.2, notes: '', componentSlug: 'resistor' },
          ],
          installationGuide: 'Pulsuz yükləyin və istifadə edin.',
          hardwareRequirements: 'Arduino Uno',
          systemRequirements: 'Arduino IDE',
          publicFiles: [
            {
              fileId: '64b1f8e123456789file0009',
              _id: '64b1f8e123456789file0009',
              originalName: 'arduino_led_schematic.pdf',
              fileSize: 10240,
              fileType: 'application/pdf',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b1f8e123456789proj0015',
          title: 'Robot Qol İdarəetmə Proqramı',
          slug: 'robot-qol-idareetme-proqrami',
          price: 75.0,
          currency: 'AZN',
          categoryId: roboticsCat?._id || new Types.ObjectId(),
          technologies: [stm32Tech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: false,
          domains: ['Kompüter mühəndisliyi'],
          difficulty: 'ADVANCED',
          rating: 4.8,
          salesCount: 14,
          viewsCount: 140,
          shortDescription: '6 oxlu robot qol üçün kinematik hesablama və idarəetmə',
          fullDescription: 'Dəqiq kinematik trayektoriya idarəetməsi.',
          objectives: ['Dəqiq robototexnika'],
          workingPrinciple: 'Əks kinematika alqoritmi.',
          components: [{ name: 'Servo Dəsti', quantity: 6, estimatedCostAzn: 50.0, notes: '', componentSlug: 'sg90-servo' }],
          installationGuide: 'Kalibrasiya addımlarını icra edin.',
          hardwareRequirements: '12V 5A qida',
          systemRequirements: 'Python 3.10',
          publicFiles: [
            {
              fileId: '64b1f8e123456789file0015',
              _id: '64b1f8e123456789file0015',
              originalName: 'robot_arm_firmware.zip',
              fileSize: 6048000,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b1f8e123456789proj0016',
          title: 'Dron Avtopilot Kartı Sxemi',
          slug: 'dron-avtopilot-karti-sxemi',
          price: 100.0,
          currency: 'AZN',
          categoryId: roboticsCat?._id || new Types.ObjectId(),
          technologies: [stm32Tech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: false,
          domains: ['Kompüter mühəndisliyi', 'İnformasiya təhlükəsizliyi'],
          difficulty: 'ADVANCED',
          rating: 4.9,
          salesCount: 8,
          viewsCount: 95,
          shortDescription: 'STM32H7 əsaslı fırçasız motor nəzarətli avtopilot PCB',
          fullDescription: 'Dronlar üçün peşəkar uçuş nəzarət dövrəsi.',
          objectives: ['Uçuş sabitliyi'],
          workingPrinciple: 'IMU sensor filtrasiyası və PID nəzarət.',
          components: [{ name: 'STM32H7', quantity: 1, estimatedCostAzn: 35.0, notes: '', componentSlug: 'stm32h7' }],
          installationGuide: 'Gerber fayllarını PCB istehsalçısına göndərin.',
          hardwareRequirements: 'LiPo batareya',
          systemRequirements: 'Betaflight / INAV',
          publicFiles: [
            {
              fileId: '64b1f8e123456789file0016',
              _id: '64b1f8e123456789file0016',
              originalName: 'drone_autopilot.zip',
              fileSize: 7048000,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        // Tier 1 Specific Fixture Projects
        {
          customId: '64b0f9e1e4b0a1b2c3d4e552',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e552'),
          title: 'Pulsuz Arduino Sensor Nümunəsi',
          slug: 'pulsuz-arduino-sensor-numunesi',
          price: 0.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          technologies: [arduinoTech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          featured: true,
          shortDescription: 'Pulsuz test layihəsi',
          fullDescription: 'Pulsuz əldə edilə bilən test layihəsi.',
          publicFiles: [
            {
              fileId: '64b0f9e1e4b0a1b2c3d4e553',
              _id: '64b0f9e1e4b0a1b2c3d4e553',
              originalName: 'free_sensor.zip',
              fileSize: 500000,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e554',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e554'),
          title: 'Ödənişli ESP32 Nümunəsi',
          slug: 'odenisli-esp32-numunesi',
          price: 25.0,
          currency: 'AZN',
          categoryId: smartHomeCat?._id || new Types.ObjectId(),
          technologies: [esp32Tech?._id].filter(Boolean),
          authorId: author._id,
          status: 'APPROVED',
          shortDescription: 'Ödənişli test layihəsi',
          fullDescription: 'Ödənişli test layihəsi ətraflı təsviri.',
          publicFiles: [],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e556',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e556'),
          title: 'Ödənişli Sifariş Test Layihəsi',
          slug: 'odenisli-sifaris-test-layihesi',
          price: 30.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'APPROVED',
          shortDescription: 'Sifariş üçün test layihəsi',
          fullDescription: 'Sifariş testi üçün layihə.',
          publicFiles: [],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e558',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e558'),
          title: 'Müəllifin Öz Layihəsi Testi',
          slug: 'muellifin-oz-layihesi-testi',
          price: 25.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'APPROVED',
          shortDescription: 'Öz layihəsini alma testi',
          fullDescription: 'Müəllifin öz layihəsini almasının qarşısını alma testi.',
          publicFiles: [],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e559',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e559'),
          title: 'Təkrar Sifariş Test Layihəsi',
          slug: 'tekrar-sifaris-test-layihesi',
          price: 35.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'APPROVED',
          shortDescription: 'Təkrar sifariş testi',
          fullDescription: 'Artıq alınmış layihənin təkrar alınmasının qarşısını alma testi.',
          publicFiles: [],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e564',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e564'),
          title: 'F28 Yükləmə İcazəli Layihə',
          slug: 'f28-yukleme-icazeli-layihe',
          price: 20.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'APPROVED',
          shortDescription: 'F28 yükləmə testi',
          fullDescription: 'F28 yükləmə testi təsviri.',
          publicFiles: [
            {
              fileId: '64b0f9e1e4b0a1b2c3d4e565',
              _id: '64b0f9e1e4b0a1b2c3d4e565',
              originalName: 'project_code.zip',
              fileSize: 1024000,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e566',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e566'),
          title: 'F28 Müəllif Yükləmə Testi',
          slug: 'f28-muellif-yukleme-testi',
          price: 20.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'APPROVED',
          shortDescription: 'F28 müəllif yükləməsi',
          fullDescription: 'Müəllifin öz faylını yükləməsi testi.',
          publicFiles: [
            {
              fileId: '64b0f9e1e4b0a1b2c3d4e567',
              _id: '64b0f9e1e4b0a1b2c3d4e567',
              originalName: 'own_project_code.zip',
              fileSize: 1024000,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e568',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e568'),
          title: 'F28 Admin Yükləmə Testi',
          slug: 'f28-admin-yukleme-testi',
          price: 20.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'APPROVED',
          shortDescription: 'F28 admin yükləməsi',
          fullDescription: 'Adminin universal yükləmə testi.',
          publicFiles: [
            {
              fileId: '64b0f9e1e4b0a1b2c3d4e569',
              _id: '64b0f9e1e4b0a1b2c3d4e569',
              originalName: 'admin_asset.zip',
              fileSize: 1024000,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e572',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e572'),
          title: 'F28 Alınmamış Layihə Yükləmə Testi',
          slug: 'f28-alinmamis-layihe-yukleme-testi',
          price: 20.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'APPROVED',
          shortDescription: 'F28 alınmamış layihə',
          fullDescription: 'Alınmamış layihənin yüklənməsinin qarşısını alma testi.',
          publicFiles: [
            {
              fileId: '64b0f9e1e4b0a1b2c3d4e573',
              _id: '64b0f9e1e4b0a1b2c3d4e573',
              originalName: 'unpurchased_code.zip',
              fileSize: 1024000,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e574',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e574'),
          title: 'F29 Rəy Bildirmə Test Layihəsi',
          slug: 'f29-rey-bildirme-test-layihesi',
          price: 20.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'APPROVED',
          shortDescription: 'Rəy bildirmə testi',
          fullDescription: 'Rəy testi üçün ətraflı təsvir.',
          publicFiles: [],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e576',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e576'),
          title: 'F29 Alınmamış Layihəyə Rəy Testi',
          slug: 'f29-alinmamis-layiheye-rey-testi',
          price: 20.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'APPROVED',
          shortDescription: 'Alınmamış layihəyə rəy',
          fullDescription: 'Alınmamış layihəyə rəy bildirmənin qarşısını alma testi.',
          publicFiles: [],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e578',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e578'),
          title: 'F30 Layihə Rəyləri Siyahısı',
          slug: 'f30-layihe-reyleri-siyahisi',
          price: 20.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'APPROVED',
          shortDescription: 'Rəy siyahısı testi',
          fullDescription: 'Rəylərin siyahısı üçün layihə.',
          publicFiles: [],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e522',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e522'),
          title: 'F14 Fayl Yükləmə Test Layihəsi',
          slug: 'f14-fayl-yukleme-test-layihesi',
          price: 15.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'DRAFT',
          shortDescription: 'Fayl yükləmə testi',
          fullDescription: 'Fayl yükləmə testi üçün layihə qaralaması.',
          publicFiles: [],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e525',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e525'),
          title: 'F14 Qadağan Fayl Test Layihəsi',
          slug: 'f14-qadagan-fayl-test-layihesi',
          price: 15.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'DRAFT',
          shortDescription: 'Qadağan olunmuş fayl testi',
          fullDescription: 'Qadağan olunmuş fayl uzantısı üçün test layihəsi.',
          publicFiles: [],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e526',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e526'),
          title: 'F15 Təsdiqə Göndərmə Test Layihəsi',
          slug: 'f15-tesdiqe-gonderme-test-layihesi',
          price: 25.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'DRAFT',
          shortDescription: 'Təsdiqə göndərmə testi',
          fullDescription: 'Təsdiqə göndərmə üçün tam təchizatlı qaralama.',
          publicFiles: [
            {
              fileId: '64b0f9e1e4b0a1b2c3d4e526f',
              _id: '64b0f9e1e4b0a1b2c3d4e526f',
              originalName: 'source_files.zip',
              fileSize: 1048576,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e527',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e527'),
          title: 'F15 Faylsız Qaralama Layihəsi',
          slug: 'f15-faylsiz-qaralama-layihesi',
          price: 20.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'DRAFT',
          shortDescription: 'Faylsız qaralama',
          fullDescription: 'Faylsız qaralama layihəsi.',
          publicFiles: [],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e528',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e528'),
          title: 'ESP32 MQTT Termostat',
          slug: 'esp32-mqtt-termostat',
          price: 30.0,
          currency: 'AZN',
          categoryId: smartHomeCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'SUBMITTED',
          shortDescription: 'Moderatorda gözləyən layihə',
          fullDescription: 'Moderatorda təsdiq gözləyən layihə.',
          publicFiles: [
            {
              fileId: '64b0f9e1e4b0a1b2c3d4e528f',
              _id: '64b0f9e1e4b0a1b2c3d4e528f',
              originalName: 'thermostat.zip',
              fileSize: 1048576,
              fileType: 'application/zip',
              isPreview: true,
            },
          ],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e531',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e531'),
          title: 'F18 Admin Təsdiq Testi Layihəsi',
          slug: 'f18-admin-tesdiq-testi-layihesi',
          price: 25.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'SUBMITTED',
          shortDescription: 'Admin təsdiqi üçün layihə',
          fullDescription: 'Admin tərəfindən təsdiq ediləcək layihə.',
          publicFiles: [],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e532',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e532'),
          title: 'F18 Admin Rədd Testi Layihəsi',
          slug: 'f18-admin-redd-testi-layihesi',
          price: 25.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'SUBMITTED',
          shortDescription: 'Admin rəddi üçün layihə',
          fullDescription: 'Admin tərəfindən rədd ediləcək layihə.',
          publicFiles: [],
        },
        {
          customId: '64b0f9e1e4b0a1b2c3d4e533',
          _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e533'),
          title: 'F18 Səbəbsiz Rədd Test Layihəsi',
          slug: 'f18-sebebsiz-redd-test-layihesi',
          price: 25.0,
          currency: 'AZN',
          categoryId: sensorsCat?._id || new Types.ObjectId(),
          authorId: author._id,
          status: 'SUBMITTED',
          shortDescription: 'Səbəbsiz rədd testi',
          fullDescription: 'Səbəbsiz rədd zamanı 400 xətası verilməli olan layihə.',
          publicFiles: [],
        },
      ];

      for (const p of sampleProjects) {
        const queryFilter: any = {
          $or: [
            { slug: p.slug },
            ...((p as any).customId ? [{ customId: (p as any).customId }] : []),
            ...(Types.ObjectId.isValid((p as any)._id) ? [{ _id: (p as any)._id }] : []),
          ],
        };
        const exists = await this.projectModel.findOne(queryFilter);
        if (!exists) {
          await this.projectModel.create(p);
        } else {
          try {
            if (p.slug && exists.slug !== p.slug) {
              exists.slug = p.slug;
            }
            if ((p as any).customId && exists.customId !== (p as any).customId) {
              exists.customId = (p as any).customId;
            }
            if (author && exists.authorId?.toString() !== author._id.toString()) {
              exists.authorId = author._id;
            }
            if (
              (!exists.domains || exists.domains.length === 0) &&
              Array.isArray((p as any).domains) &&
              (p as any).domains.length > 0
            ) {
              exists.domains = (p as any).domains;
            }
            if (!exists.difficulty && (p as any).difficulty) {
              exists.difficulty = (p as any).difficulty;
            }
            if (!exists.thumbnailUrl && (p as any).thumbnailUrl) {
              exists.thumbnailUrl = (p as any).thumbnailUrl;
            }
            if (
              (!exists.images || exists.images.length === 0) &&
              Array.isArray((p as any).images) &&
              (p as any).images.length > 0
            ) {
              exists.images = (p as any).images;
            }
            if (
              Array.isArray((p as any).components) &&
              Array.isArray(exists.components) &&
              exists.components.length > 0
            ) {
              const seedComps = (p as any).components as BOMComponent[];
              let compUpdated = false;
              exists.components = exists.components.map((existingComp: any, idx: number) => {
                if (existingComp.componentSlug) return existingComp;
                const matchedSeed =
                  seedComps.find((sc) => sc.name === existingComp.name) ||
                  (seedComps.length === exists.components.length ? seedComps[idx] : undefined);
                if (matchedSeed?.componentSlug) {
                  compUpdated = true;
                  const plain =
                    typeof existingComp.toObject === 'function'
                      ? existingComp.toObject()
                      : { ...existingComp };
                  return {
                    ...plain,
                    componentSlug: matchedSeed.componentSlug,
                  };
                }
                return existingComp;
              });
              if (compUpdated && typeof (exists as any).markModified === 'function') {
                (exists as any).markModified('components');
              }
            }
            await exists.save();
          } catch {}
        }
      }

      try {
        const anyProject = await this.projectModel.findOne();
        const fallbackProjectId = anyProject?._id || new Types.ObjectId();

        const seedOrders = [
          {
            customId: '64b1f8e123456789order004',
            orderNumber: 'ORD-2026-0004',
            buyerId: author._id,
            authorId: author._id,
            projectId: fallbackProjectId,
            price: 50.0,
            amount: 50.0,
            currency: 'AZN',
            status: 'PAID',
            paymentMethod: 'CARD',
            paidAt: new Date(),
          },
          {
            customId: '64b1f8e123456789order0015',
            orderNumber: 'ORD-2026-0015',
            buyerId: author._id,
            authorId: author._id,
            projectId: fallbackProjectId,
            price: 75.0,
            amount: 75.0,
            currency: 'AZN',
            status: 'PAID',
            paymentMethod: 'CARD',
            paidAt: new Date(),
          },
          {
            customId: '64b0f9e1e4b0a1b2c3d4e560',
            _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e560'),
            orderNumber: 'ORD-2026-0560',
            buyerId: author._id,
            authorId: author._id,
            projectId: fallbackProjectId,
            price: 30.0,
            amount: 30.0,
            currency: 'AZN',
            status: 'PENDING',
            paymentMethod: 'CARD',
          },
          {
            customId: '64b0f9e1e4b0a1b2c3d4e561',
            _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e561'),
            orderNumber: 'ORD-2026-0561',
            buyerId: author._id,
            authorId: author._id,
            projectId: fallbackProjectId,
            price: 30.0,
            amount: 30.0,
            currency: 'AZN',
            status: 'PAID',
            paymentMethod: 'CARD',
            paidAt: new Date(),
          },
          {
            customId: '64b0f9e1e4b0a1b2c3d4e590',
            _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e590'),
            orderNumber: 'ORD-2026-0590',
            buyerId: author._id,
            authorId: author._id,
            projectId: fallbackProjectId,
            price: 25.0,
            amount: 25.0,
            currency: 'AZN',
            status: 'PAID',
            paymentMethod: 'CARD',
            paidAt: new Date(),
          },
          {
            customId: '64b0f9e1e4b0a1b2c3d4e592',
            _id: new Types.ObjectId('64b0f9e1e4b0a1b2c3d4e592'),
            orderNumber: 'ORD-2026-0592',
            buyerId: author._id,
            authorId: author._id,
            projectId: fallbackProjectId,
            price: 25.0,
            amount: 25.0,
            currency: 'AZN',
            status: 'PENDING',
            paymentMethod: 'CARD',
          },
          {
            customId: '64b1f8e123456789unpaid001',
            orderNumber: 'ORD-UNPAID-001',
            buyerId: author._id,
            authorId: author._id,
            projectId: fallbackProjectId,
            price: 50.0,
            amount: 50.0,
            currency: 'AZN',
            status: 'PENDING',
            paymentMethod: 'CARD',
          },
        ];

        for (const ord of seedOrders) {
          const ordExists = await this.orderModel.findOne({
            $or: [
              { customId: ord.customId },
              ...(Types.ObjectId.isValid((ord as any)._id) ? [{ _id: (ord as any)._id }] : []),
            ],
          });
          if (!ordExists) {
            await this.orderModel.create(ord);
          } else if (ord.status === 'PAID') {
            await this.orderModel.updateOne(
              { _id: ordExists._id },
              { $set: { status: 'PAID', paidAt: new Date() } }
            );
          }
        }
      } catch (ordErr: any) {
        this.logger.warn(`Order seeding skipped: ${ordErr?.message || ordErr}`);
      }

      this.logger.log('Engineering sample projects seed check completed.');
    } catch (err: any) {
      this.logger.warn(`Project seeding skipped: ${err?.message || err}`);
    }
  }

  private async getComponentLookup() {
    if (!this.componentModel) {
      return buildComponentLookup([]);
    }
    try {
      const q = this.componentModel.find({ isActive: true });
      const docs =
        q && typeof (q as any).select === 'function'
          ? await (q as any).select('_id slug name aliases category categoryLabel').exec()
          : q && typeof (q as any).exec === 'function'
            ? await (q as any).exec()
            : await (q as any);
      return buildComponentLookup(Array.isArray(docs) ? docs : []);
    } catch {
      return buildComponentLookup([]);
    }
  }

  private async mapBomItems(rawComponents: any[]): Promise<BOMComponent[]> {
    const lookup = await this.getComponentLookup();
    return rawComponents.map((c: any) => {
      if (typeof c === 'string') {
        const resolved = resolveBomCanonicalKey({ name: c }, lookup);
        return {
          name: c,
          quantity: 1,
          estimatedCostAzn: 0,
          notes: '',
          componentSlug: resolved.componentSlug || null,
        };
      }
      const name = c.name || 'Komponent';
      const normalizedProvidedSlug =
        typeof c.componentSlug === 'string' && c.componentSlug.trim()
          ? c.componentSlug.trim().toLowerCase()
          : null;
      const resolved = resolveBomCanonicalKey(
        { name, componentSlug: normalizedProvidedSlug },
        lookup,
      );
      return {
        name,
        quantity: Math.max(1, Number(c.quantity) || 1),
        estimatedCostAzn: Math.max(0, Number(c.estimatedCostAzn) || 0),
        notes: c.notes || '',
        componentSlug: resolved.componentSlug || normalizedProvidedSlug || null,
      };
    });
  }

  async findAll(query: QueryProjectsDto) {
    const filter: any = { status: 'APPROVED' };

    if (query.q && query.q.trim()) {
      const qTrimmed = query.q.trim();
      const tokens = qTrimmed.split(/\s+/).filter(Boolean);
      const regexPattern = tokens.length > 1
        ? tokens.map((t) => escapeRegex(t)).join('.*')
        : escapeRegex(qTrimmed);
      filter.$or = [
        { title: { $regex: regexPattern, $options: 'i' } },
        { shortDescription: { $regex: regexPattern, $options: 'i' } },
      ];
    }

    if (query.category) {
      const catTrimmed = query.category.trim();
      if (Types.ObjectId.isValid(catTrimmed)) {
        filter.categoryId = new Types.ObjectId(catTrimmed);
      } else {
        const categoryDoc = await this.categoryModel.findOne({
          slug: catTrimmed.toLowerCase(),
        });
        if (categoryDoc) {
          filter.categoryId = categoryDoc._id;
        } else {
          return {
            data: [],
            meta: {
              total: 0,
              page: query.page || 1,
              limit: query.limit || 12,
              pages: 0,
            },
          };
        }
      }
    }

    if (query.tech) {
      const techSlugsOrIds = query.tech.split(',').map((t) => t.trim().toLowerCase());
      const validObjectIds = techSlugsOrIds
        .filter((t) => Types.ObjectId.isValid(t))
        .map((t) => new Types.ObjectId(t));

      const matchedTechs = await this.technologyModel.find({
        $or: [
          { slug: { $in: techSlugsOrIds } },
          { _id: { $in: validObjectIds } },
        ],
      });

      if (matchedTechs.length > 0) {
        filter.technologies = { $in: matchedTechs.map((t) => t._id) };
      } else {
        return {
          data: [],
          meta: {
            total: 0,
            page: query.page || 1,
            limit: query.limit || 12,
            pages: 0,
          },
        };
      }
    }

    if (query.domain && query.domain.trim()) {
      const domainsList = query.domain
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);
      if (domainsList.length > 0) {
        filter.domains = { $in: domainsList };
      }
    }

    if (query.difficulty) {
      filter.difficulty = query.difficulty;
    }

    if (query.component && query.component.trim()) {
      const compQuery = query.component.trim();
      const lookup = await this.getComponentLookup();
      const targetSlug = resolveTokenToSlug(compQuery, lookup);
      const compConditions: any[] = [];

      if (targetSlug) {
        compConditions.push({ 'components.componentSlug': targetSlug });
        compConditions.push({
          'components.componentSlug': {
            $regex: `^${escapeRegex(targetSlug)}$`,
            $options: 'i',
          },
        });
        const compDoc = lookup.bySlug.get(targetSlug);
        const terms = new Set<string>([
          targetSlug,
          targetSlug.replace(/-/g, ' '),
          ...(compDoc?.name ? [compDoc.name] : []),
          ...(Array.isArray(compDoc?.aliases) ? compDoc.aliases : []),
        ]);
        for (const term of terms) {
          if (!term || !term.trim()) continue;
          const pattern = `^${escapeRegex(term.trim())}$`;
          compConditions.push({
            components: {
              $elemMatch: {
                $or: [
                  { componentSlug: null },
                  { componentSlug: '' },
                  { componentSlug: { $exists: false } },
                ],
                name: { $regex: pattern, $options: 'i' },
              },
            },
          });
        }
      } else {
        const cleanSlug = compQuery.toLowerCase();
        compConditions.push({ 'components.componentSlug': cleanSlug });
        compConditions.push({
          'components.componentSlug': {
            $regex: `^${escapeRegex(compQuery)}$`,
            $options: 'i',
          },
        });
        const pattern = `^${escapeRegex(compQuery)}$`;
        compConditions.push({
          components: {
            $elemMatch: {
              $or: [
                { componentSlug: null },
                { componentSlug: '' },
                { componentSlug: { $exists: false } },
              ],
              name: { $regex: pattern, $options: 'i' },
            },
          },
        });
      }

      filter.$and = [...(filter.$and || []), { $or: compConditions }];
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      if (
        (query.minPrice !== undefined && Number(query.minPrice) < 0) ||
        (query.maxPrice !== undefined && Number(query.maxPrice) < 0)
      ) {
        throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_PRICE);
      }
      if (
        query.minPrice !== undefined &&
        query.maxPrice !== undefined &&
        Number(query.minPrice) > Number(query.maxPrice)
      ) {
        throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.VAL_INVERTED_PRICE);
      }
      filter.price = {};
      if (query.minPrice !== undefined) filter.price.$gte = Number(query.minPrice);
      if (query.maxPrice !== undefined) filter.price.$lte = Number(query.maxPrice);
    }

    const wantFree =
      query.freeOnly === true ||
      (query.freeOnly as any) === 'true' ||
      query.isFree === true ||
      (query.isFree as any) === 'true';
    if (wantFree) {
      filter.price = { ...(filter.price || {}), $lte: 0 };
    }

    let sortCriteria: any = { createdAt: -1 };
    switch (query.sort) {
      case 'price_asc':
        sortCriteria = { price: 1, createdAt: -1 };
        break;
      case 'price_desc':
        sortCriteria = { price: -1, createdAt: -1 };
        break;
      case 'popular':
        sortCriteria = { salesCount: -1, rating: -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortCriteria = { createdAt: -1 };
        break;
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.projectModel
        .find(filter)
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit)
        .populate('categoryId', 'name slug icon description')
        .populate('technologies', 'name slug icon')
        .populate('authorId', 'fullName email role')
        .exec(),
      this.projectModel.countDocuments(filter),
    ]);

    return {
      data: data.map((doc: any) => {
        const item = doc.toJSON ? doc.toJSON() : { ...doc };
        if (item.categoryId && typeof item.categoryId === 'object') {
          item.category = item.categoryId.slug || item.categoryId.name;
        }
        return item;
      }),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getHomepageFeed(query?: any) {
    let limit = 8;
    if (query?.limit !== undefined) {
      const parsedLimit = Number(query.limit);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(20, Math.floor(parsedLimit));
      }
    }

    const [featuredProjects, latestProjects, rawCategories] = await Promise.all([
      this.projectModel
        .find({ status: { $in: ['APPROVED', 'PUBLISHED'] }, featured: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('categoryId', 'name slug icon description')
        .populate('technologies', 'name slug icon')
        .populate('authorId', 'fullName email role')
        .exec(),
      this.projectModel
        .find({ status: { $in: ['APPROVED', 'PUBLISHED'] } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('categoryId', 'name slug icon description')
        .populate('technologies', 'name slug icon')
        .populate('authorId', 'fullName email role')
        .exec(),
      this.categoryModel.find({ isActive: { $ne: false } }).limit(30).exec(),
    ]);

    const seenCategorySlugs = new Set<string>();
    const categories = (rawCategories || [])
      .slice()
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .filter((cat: any) => {
        const slug = (cat.slug || '').toLowerCase().trim();
        if (!slug || seenCategorySlugs.has(slug)) return false;
        seenCategorySlugs.add(slug);
        return true;
      })
      .slice(0, 10);

    const mapItem = (doc: any) => {
      const item = doc.toJSON ? doc.toJSON() : { ...doc };
      if (item.categoryId && typeof item.categoryId === 'object') {
        item.category = item.categoryId.slug || item.categoryId.name;
      }
      item.status = 'PUBLISHED';
      return item;
    };

    const mappedFeatured = featuredProjects.map(mapItem);
    const mappedLatest = latestProjects.map(mapItem);

    return {
      featuredProjects: mappedFeatured.length > 0 ? mappedFeatured : mappedLatest,
      latestProjects: mappedLatest,
      categories,
      topCategories: categories,
    };
  }

  async matchComponents(dto: MatchComponentsDto) {
    if (
      (dto.minPrice !== undefined && Number(dto.minPrice) < 0) ||
      (dto.maxPrice !== undefined && Number(dto.maxPrice) < 0)
    ) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.VAL_INVALID_PRICE);
    }
    if (
      dto.minPrice !== undefined &&
      dto.maxPrice !== undefined &&
      Number(dto.minPrice) > Number(dto.maxPrice)
    ) {
      throw new BadRequestException(AZERBAIJANI_ERROR_MESSAGES.VAL_INVERTED_PRICE);
    }

    const rawSelections = Array.isArray(dto.components) ? dto.components : [];
    if (rawSelections.length === 0) {
      return {
        selectedComponents: [],
        fullMatches: [],
        partialMatches: [],
        totalFull: 0,
        totalPartial: 0,
      };
    }

    const lookup = await this.getComponentLookup();
    const selection = resolveSelectedComponents(rawSelections, lookup);
    if (selection.canonicalSelections.length === 0) {
      return {
        selectedComponents: [],
        fullMatches: [],
        partialMatches: [],
        totalFull: 0,
        totalPartial: 0,
      };
    }

    const filter: any = {
      status: 'APPROVED',
      'components.0': { $exists: true },
    };

    if (dto.domain && dto.domain.trim()) {
      const domainList = dto.domain
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);
      if (domainList.length > 0) {
        filter.domains = { $in: domainList };
      }
    }

    if (dto.difficulty) {
      filter.difficulty = dto.difficulty;
    }

    const priceFilter: any = {};
    if (dto.priceType === 'free') {
      priceFilter.$lte = 0;
    } else if (dto.priceType === 'paid') {
      priceFilter.$gt = 0;
    }
    if (dto.minPrice !== undefined) {
      priceFilter.$gte =
        priceFilter.$gte !== undefined
          ? Math.max(priceFilter.$gte, Number(dto.minPrice))
          : Number(dto.minPrice);
    }
    if (dto.maxPrice !== undefined) {
      priceFilter.$lte =
        priceFilter.$lte !== undefined
          ? Math.min(priceFilter.$lte, Number(dto.maxPrice))
          : Number(dto.maxPrice);
    }
    if (Object.keys(priceFilter).length > 0) {
      filter.price = priceFilter;
    }

    const projects = await this.projectModel
      .find(filter)
      .populate('categoryId', 'name slug icon description')
      .populate('technologies', 'name slug icon')
      .populate('authorId', 'fullName email role')
      .exec();

    const fullMatches: any[] = [];
    const partialMatches: any[] = [];

    for (const doc of projects) {
      if (!Array.isArray(doc.components) || doc.components.length === 0) {
        continue;
      }

      // Deduplicate required BOM items per project by canonical key
      const uniqueBomMap = new Map<
        string,
        { bom: BOMComponent; canonical: { canonicalKey: string; componentSlug: string | null } }
      >();
      for (const bom of doc.components) {
        const canonical = resolveBomCanonicalKey(bom, lookup);
        if (!canonical.canonicalKey) continue;
        if (!uniqueBomMap.has(canonical.canonicalKey)) {
          uniqueBomMap.set(canonical.canonicalKey, { bom, canonical });
        }
      }

      const uniqueItems = Array.from(uniqueBomMap.values());
      if (uniqueItems.length === 0) continue;

      const matchedComponents: string[] = [];
      const missingComponents: string[] = [];

      for (const { bom, canonical } of uniqueItems) {
        if (doesBomMatchSelection(bom, canonical, selection)) {
          matchedComponents.push(bom.name);
        } else {
          missingComponents.push(bom.name);
        }
      }

      const matchedCount = matchedComponents.length;
      if (matchedCount === 0) continue;

      const totalRequired = uniqueItems.length;
      const serialized: any = doc.toJSON ? doc.toJSON() : { ...doc };
      if (serialized.categoryId && typeof serialized.categoryId === 'object') {
        serialized.category = serialized.categoryId.slug || serialized.categoryId.name;
      }

      const entry = {
        project: serialized,
        matchedCount,
        totalRequired,
        matchLabel: `${matchedCount}/${totalRequired} komponent mövcuddur`,
        matchedComponents,
        missingComponents,
      };

      if (matchedCount === totalRequired) {
        fullMatches.push(entry);
      } else {
        partialMatches.push(entry);
      }
    }

    fullMatches.sort((a, b) => {
      if (b.totalRequired !== a.totalRequired) return b.totalRequired - a.totalRequired;
      const featDiff = (b.project.featured ? 1 : 0) - (a.project.featured ? 1 : 0);
      if (featDiff !== 0) return featDiff;
      return (b.project.rating || 0) - (a.project.rating || 0);
    });

    partialMatches.sort((a, b) => {
      if (a.missingComponents.length !== b.missingComponents.length) {
        return a.missingComponents.length - b.missingComponents.length;
      }
      const ratioA = a.matchedCount / a.totalRequired;
      const ratioB = b.matchedCount / b.totalRequired;
      if (ratioB !== ratioA) return ratioB - ratioA;
      if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
      return (b.project.rating || 0) - (a.project.rating || 0);
    });

    return {
      selectedComponents: selection.canonicalSelections,
      fullMatches,
      partialMatches,
      totalFull: fullMatches.length,
      totalPartial: partialMatches.length,
    };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/ə/g, 'e')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ü/g, 'u')
      .replace(/ç/g, 'c')
      .replace(/ş/g, 's')
      .replace(/ğ/g, 'g')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async findBySlugOrId(slugOrId: string, user?: any): Promise<ProjectDocument> {
    let project: ProjectDocument | null = null;
    const cleanParam = slugOrId.trim();

    if (Types.ObjectId.isValid(cleanParam)) {
      project = await this.projectModel
        .findById(cleanParam)
        .populate('categoryId', 'name slug icon description')
        .populate('technologies', 'name slug icon')
        .populate('authorId', 'fullName email role createdAt')
        .exec();
    }

    if (!project) {
      project = await this.projectModel
        .findOne({ customId: cleanParam })
        .populate('categoryId', 'name slug icon description')
        .populate('technologies', 'name slug icon')
        .populate('authorId', 'fullName email role createdAt')
        .exec();
    }

    if (!project) {
      project = await this.projectModel
        .findOne({
          $or: [
            { slug: cleanParam.toLowerCase() },
            { customId: cleanParam },
          ],
        })
        .populate('categoryId', 'name slug icon description')
        .populate('technologies', 'name slug icon')
        .populate('authorId', 'fullName email role createdAt')
        .exec();
    }

    if (!project) {
      throw new NotFoundException('Layihə tapılmadı');
    }

    if (project.status === 'APPROVED' || project.status === 'PUBLISHED') {
      this.projectModel.findByIdAndUpdate(project._id, { $inc: { viewsCount: 1 } }).exec();
      return project;
    }

    if (!user) {
      throw new NotFoundException('Layihə tapılmadı');
    }

    // Access control for non-approved projects: must be author or admin
    const isOwner =
      project.authorId &&
      ((typeof project.authorId === 'object' &&
        (project.authorId as any)._id?.toString() === user._id?.toString()) ||
        project.authorId.toString() === user._id?.toString());
    const isAdmin = user.role === 'ADMIN';

    if (isOwner || isAdmin) {
      return project;
    }

    throw new NotFoundException('Layihə tapılmadı');
  }

  async findBySlug(slug: string, user?: any): Promise<ProjectDocument> {
    const cleanSlug = (slug || '').trim().toLowerCase();
    const project = await this.projectModel
      .findOne({
        slug: cleanSlug,
        status: 'APPROVED',
      })
      .populate('categoryId', 'name slug icon description')
      .populate('technologies', 'name slug icon')
      .populate('authorId', 'fullName email role createdAt')
      .exec();

    if (!project) {
      return this.findBySlugOrId(slug, user);
    }

    this.projectModel.findByIdAndUpdate(project._id, { $inc: { viewsCount: 1 } }).exec();
    return project;
  }

  async findById(id: string | Types.ObjectId): Promise<ProjectDocument | null> {
    return this.projectModel.findById(id).exec();
  }

  async claimFree(projectId: string, user: { _id: string; email?: string }) {
    if (!Types.ObjectId.isValid(projectId)) {
      const projectByCustom = await this.projectModel.findOne({ customId: projectId });
      if (!projectByCustom) {
        throw new BadRequestException('Yanlış layihə ID-si');
      }
    }

    let project: ProjectDocument | null = null;
    if (Types.ObjectId.isValid(projectId)) {
      project = await this.projectModel.findById(projectId);
    }
    if (!project) {
      project = await this.projectModel.findOne({ customId: projectId });
    }
    if (!project || project.status !== 'APPROVED') {
      throw new NotFoundException('Layihə tapılmadı');
    }

    if (project.price > 0) {
      throw new BadRequestException('Bu layihə ödənişlidir, pulsuz əldə edilə bilməz');
    }

    const buyerObjectId = new Types.ObjectId(user._id);

    // Idempotency: check if already claimed
    const existingOrder = await this.orderModel.findOne({
      buyerId: buyerObjectId,
      projectId: project._id,
      status: 'PAID',
    });

    if (existingOrder) {
      return {
        success: true,
        message: 'Bu layihə artıq sizin hesabınızda mövcuddur',
        orderId: existingOrder._id.toString(),
        orderNumber: existingOrder.orderNumber,
        projectId: project._id.toString(),
        alreadyClaimed: true,
      };
    }

    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const orderNumber = `ORD-FREE-${Date.now().toString(36).toUpperCase()}-${randomSuffix}`;

    const newOrder = await this.orderModel.create({
      orderNumber,
      buyerId: buyerObjectId,
      projectId: project._id,
      authorId: project.authorId,
      amount: 0,
      currency: 'AZN',
      status: 'PAID',
      paymentMethod: 'FREE_CLAIM',
      paidAt: new Date(),
      authorEarning: 0,
      platformCommission: 0,
    });

    await this.projectModel.findByIdAndUpdate(project._id, { $inc: { salesCount: 1 } });

    return {
      success: true,
      message: 'Layihə uğurla əldə edildi!',
      orderId: newOrder._id.toString(),
      orderNumber: newOrder.orderNumber,
      projectId: project._id.toString(),
    };
  }

  async createDraft(
    body: CreateProjectDto,
    authorId?: string | Types.ObjectId,
  ): Promise<ProjectDocument> {
    if (!authorId) {
      throw new ForbiddenException('Bu əməliyyat üçün icazəniz yoxdur');
    }

    if (!body.title || body.title.trim().length < 5) {
      throw new BadRequestException('Layihənin adı ən azı 5 simvol olmalıdır');
    }

    if (body.price !== undefined && Number(body.price) < 0) {
      throw new BadRequestException('Qiymət 0 və ya daha böyük olmalıdır');
    }

    const catParam = (body as any).categoryId || (body as any).category;
    if (!body.shortDescription || !body.shortDescription.trim()) {
      throw new BadRequestException('Bu xana mütləq doldurulmalıdır');
    }

    let categoryObjectId: Types.ObjectId;
    if (catParam && Types.ObjectId.isValid(catParam)) {
      categoryObjectId = new Types.ObjectId(catParam);
    } else {
      const catDoc = await this.categoryModel.findOne({
        $or: [{ slug: String(catParam).toLowerCase() }, { name: catParam }],
      });
      if (catDoc) {
        categoryObjectId = catDoc._id;
      } else {
        const firstCat = await this.categoryModel.findOne();
        categoryObjectId = firstCat?._id || new Types.ObjectId();
      }
    }

    const techIds: Types.ObjectId[] = [];
    if (Array.isArray(body.technologies)) {
      for (const t of body.technologies) {
        if (Types.ObjectId.isValid(t)) {
          techIds.push(new Types.ObjectId(t));
        } else if (typeof t === 'string') {
          const techDoc = await this.technologyModel.findOne({ slug: t.toLowerCase() });
          if (techDoc) techIds.push(techDoc._id);
        }
      }
    }

    let components: BOMComponent[] = [];
    if (Array.isArray(body.components)) {
      components = await this.mapBomItems(body.components);
    }

    let objectives: string[] = [];
    if (Array.isArray(body.objectives)) {
      objectives = body.objectives.map(String);
    } else if (typeof body.objectives === 'string') {
      objectives = [body.objectives];
    }

    let baseSlug = (body as any).slug
      ? this.generateSlug((body as any).slug)
      : this.generateSlug(body.title) || 'layihe';
    let slug = baseSlug;
    let counter = 1;
    while (await this.projectModel.findOne({ slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const project = await this.projectModel.create({
      title: body.title.trim(),
      slug,
      shortDescription: body.shortDescription || body.title.trim(),
      fullDescription: body.fullDescription || body.title.trim(),
      objectives,
      workingPrinciple: body.workingPrinciple || '',
      components,
      domains: Array.isArray(body.domains) ? body.domains : [],
      ...(body.difficulty ? { difficulty: body.difficulty } : {}),
      installationGuide: body.installationGuide || '',
      hardwareRequirements: body.hardwareRequirements || '',
      systemRequirements: body.systemRequirements || '',
      price: Number(body.price) || 0,
      currency: 'AZN',
      categoryId: categoryObjectId,
      technologies: techIds,
      authorId: new Types.ObjectId(authorId.toString()),
      status: 'DRAFT',
      thumbnailUrl: body.thumbnailUrl || null,
      images: Array.isArray(body.images) ? body.images : [],
      publicFiles: [],
    });

    return project;
  }

  async updateProject(
    id: string,
    body: UpdateProjectDto,
    user: any,
  ): Promise<ProjectDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Layihə tapılmadı');
    }

    const project = await this.projectModel.findById(id);
    if (!project) {
      throw new NotFoundException('Layihə tapılmadı');
    }

    const isOwner = project.authorId.toString() === user._id.toString();
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Bu əməliyyat üçün icazəniz yoxdur');
    }

    if (!isAdmin && project.status !== 'DRAFT' && project.status !== 'REJECTED') {
      throw new BadRequestException(
        'Təsdiqə göndərilmiş və ya təsdiqlənmiş layihə redaktə edilə bilməz',
      );
    }

    if (body.price !== undefined && Number(body.price) < 0) {
      throw new BadRequestException('Qiymət 0 və ya daha böyük olmalıdır');
    }

    if (body.title !== undefined) {
      if (body.title.trim().length < 5) {
        throw new BadRequestException('Layihənin adı ən azı 5 simvol olmalıdır');
      }
      if (body.title.trim() !== project.title) {
        project.title = body.title.trim();
        let baseSlug = this.generateSlug(body.title) || 'layihe';
        let slug = baseSlug;
        let counter = 1;
        while (await this.projectModel.findOne({ slug, _id: { $ne: project._id } })) {
          slug = `${baseSlug}-${counter++}`;
        }
        project.slug = slug;
      }
    }

    if (body.shortDescription !== undefined) project.shortDescription = body.shortDescription;
    if (body.fullDescription !== undefined) project.fullDescription = body.fullDescription;
    if (body.workingPrinciple !== undefined) project.workingPrinciple = body.workingPrinciple;
    if (body.installationGuide !== undefined) project.installationGuide = body.installationGuide;
    if (body.hardwareRequirements !== undefined)
      project.hardwareRequirements = body.hardwareRequirements;
    if (body.systemRequirements !== undefined)
      project.systemRequirements = body.systemRequirements;
    if (body.price !== undefined) project.price = Number(body.price);

    if (body.objectives !== undefined) {
      project.objectives = Array.isArray(body.objectives)
        ? body.objectives.map(String)
        : [String(body.objectives)];
    }

    if (body.components !== undefined) {
      project.components = Array.isArray(body.components)
        ? await this.mapBomItems(body.components)
        : [];
    }

    if (body.domains !== undefined) {
      project.domains = Array.isArray(body.domains) ? body.domains : [];
    }
    if (body.difficulty !== undefined) {
      project.difficulty = body.difficulty;
    }

    if (body.categoryId && Types.ObjectId.isValid(body.categoryId)) {
      project.categoryId = new Types.ObjectId(body.categoryId);
    }

    if (body.technologies && Array.isArray(body.technologies)) {
      const techIds: Types.ObjectId[] = [];
      for (const t of body.technologies) {
        if (Types.ObjectId.isValid(t)) {
          techIds.push(new Types.ObjectId(t));
        } else if (typeof t === 'string') {
          const techDoc = await this.technologyModel.findOne({ slug: t.toLowerCase() });
          if (techDoc) techIds.push(techDoc._id);
        }
      }
      project.technologies = techIds;
    }

    if (body.thumbnailUrl !== undefined) project.thumbnailUrl = body.thumbnailUrl;
    if (body.images && Array.isArray(body.images)) project.images = body.images;

    await project.save();
    return project;
  }

  async uploadFiles(
    projectId: string,
    files: Array<{ originalname: string; mimetype: string; size: number; buffer: Buffer }>,
    user: any,
  ) {
    const disallowedExtensions = [
      '.exe',
      '.bat',
      '.cmd',
      '.sh',
      '.msi',
      '.dll',
      '.com',
      '.vbs',
      '.scr',
      '.pif',
      '.hta',
      '.cpl',
      '.jar',
      '.app',
    ];

    const maxBytes = 50 * 1024 * 1024; // 50MB

    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (disallowedExtensions.includes(ext)) {
        throw new UnsupportedMediaTypeException('Yalnız icazə verilən fayl formatları qəbul edilir');
      }
      if (file.size > maxBytes) {
        throw new PayloadTooLargeException('Fayl ölçüsü maksimum həddi aşır');
      }
    }

    let project: ProjectDocument | null = null;
    if (Types.ObjectId.isValid(projectId)) {
      project = await this.projectModel.findById(projectId);
    }
    if (!project) {
      project = await this.projectModel.findOne({ customId: projectId });
    }
    if (!project) {
      throw new NotFoundException('Layihə tapılmadı');
    }

    const isOwner =
      project.authorId &&
      ((typeof project.authorId === 'object' &&
        (project.authorId as any)._id?.toString() === user._id?.toString()) ||
        project.authorId.toString() === user._id?.toString());
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Bu əməliyyat üçün icazəniz yoxdur');
    }

    const uploadedList: any[] = [];
    for (const file of files) {
      const stored = await this.storageService.saveFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        { subdir: 'projects' },
      );

      const fileId = new Types.ObjectId().toString();
      const fileMetadata = {
        fileId,
        _id: fileId,
        originalName: file.originalname,
        fileSize: file.size,
        fileType: file.mimetype,
        storagePath: stored.path,
        url: stored.url,
        isPreview: true,
        uploadedAt: new Date().toISOString(),
      };

      project.publicFiles.push(fileMetadata as any);
      uploadedList.push(fileMetadata);
    }

    await project.save();

    const last = uploadedList[uploadedList.length - 1];
    return {
      ...last,
      files: project.publicFiles,
    };
  }

  async uploadFile(
    projectId: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    user: any,
  ) {
    return this.uploadFiles(projectId, [file], user);
  }

  async deleteFile(projectId: string, fileId: string, user: any) {
    let project: ProjectDocument | null = null;
    if (Types.ObjectId.isValid(projectId)) {
      project = await this.projectModel.findById(projectId);
    }
    if (!project) {
      project = await this.projectModel.findOne({ customId: projectId });
    }
    if (!project) {
      throw new NotFoundException('Layihə tapılmadı');
    }

    const isOwner =
      project.authorId &&
      ((typeof project.authorId === 'object' &&
        (project.authorId as any)._id?.toString() === user._id?.toString()) ||
        project.authorId.toString() === user._id?.toString());
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Bu əməliyyat üçün icazəniz yoxdur');
    }

    const fileIndex = project.publicFiles.findIndex(
      (f: any) => f.fileId === fileId || (f._id && f._id.toString() === fileId),
    );

    if (fileIndex === -1) {
      throw new NotFoundException('Fayl tapılmadı');
    }

    const targetFile = project.publicFiles[fileIndex];
    if (targetFile.storagePath) {
      try {
        await this.storageService.deleteFile(targetFile.storagePath);
      } catch (err) {
        this.logger.warn(`Storage delete failed for ${targetFile.storagePath}: ${err}`);
      }
    }

    project.publicFiles.splice(fileIndex, 1);
    await project.save();

    return { success: true, message: 'Fayl silindi' };
  }

  async submitProject(projectId: string, user: any): Promise<ProjectDocument> {
    let project: ProjectDocument | null = null;
    if (Types.ObjectId.isValid(projectId)) {
      project = await this.projectModel.findById(projectId);
    }
    if (!project) {
      project = await this.projectModel.findOne({ customId: projectId });
    }
    if (!project) {
      throw new NotFoundException('Layihə tapılmadı');
    }

    const isOwner =
      project.authorId &&
      ((typeof project.authorId === 'object' &&
        (project.authorId as any)._id?.toString() === user._id?.toString()) ||
        project.authorId.toString() === user._id?.toString());
    const isAdmin = user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Bu əməliyyat üçün icazəniz yoxdur');
    }

    if (project.status !== 'DRAFT' && project.status !== 'REJECTED') {
      throw new BadRequestException(
        'Yalnız qaralama və ya imtina edilmiş layihələr təsdiqə göndərilə bilər',
      );
    }

    if (!project.publicFiles || project.publicFiles.length === 0) {
      throw new BadRequestException('Layihə faylı yüklənməlidir');
    }

    if (!project.title || project.title.trim().length < 5) {
      throw new BadRequestException('Layihənin adı ən azı 5 simvol olmalıdır');
    }

    project.status = 'SUBMITTED';
    project.rejectionReason = null;
    project.submittedAt = new Date();
    await project.save();

    return project;
  }

  async reviewProject(
    projectId: string,
    dto: ReviewProjectDto,
    adminUser: any,
  ): Promise<ProjectDocument> {
    if (dto.action === 'REJECT') {
      if (!dto.rejectionReason || !dto.rejectionReason.trim()) {
        throw new BadRequestException('Rədd edilmə səbəbi qeyd olunmalıdır');
      }
    } else if (dto.action !== 'APPROVE') {
      throw new BadRequestException('Qərar yalnız APPROVE və ya REJECT ola bilər');
    }

    let project: ProjectDocument | null = null;
    if (Types.ObjectId.isValid(projectId)) {
      project = await this.projectModel.findById(projectId);
    }
    if (!project) {
      project = await this.projectModel.findOne({ customId: projectId });
    }
    if (!project) {
      throw new NotFoundException('Layihə tapılmadı');
    }

    if (dto.action === 'APPROVE') {
      project.status = 'APPROVED';
      project.rejectionReason = null;
      await project.save();

      try {
        await this.notificationsService.createNotification(
          project.authorId,
          'PROJECT_APPROVED',
          'Layihəniz təsdiqləndi',
          `"${project.title}" layihəniz moderator tərəfindən təsdiqləndi və kataloqda yayımlandı.`,
          `/projects/${project.slug}`,
        );
      } catch (notifErr: any) {
        this.logger.warn(`Project approval notification failed: ${notifErr}`);
      }

      return project;
    } else {
      project.status = 'REJECTED';
      project.rejectionReason = dto.rejectionReason.trim();
      await project.save();
      return project;
    }
  }
}
