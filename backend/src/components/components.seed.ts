import {
  ComponentAlternative,
  ComponentCodeExample,
  ComponentPin,
  ComponentSpec,
} from './schemas/component.schema';

export interface SeedComponentItem {
  slug: string;
  name: string;
  aliases: string[];
  category: string;
  categoryLabel: string;
  shortDescription: string;
  definition: string;
  workingPrinciple: string;
  applications: string[];
  specs: ComponentSpec[];
  pinout: ComponentPin[];
  pinoutImageUrl?: string | null;
  wiringGuide: string;
  wiringImageUrl?: string | null;
  codeExample?: ComponentCodeExample | null;
  pros: string[];
  limitations: string[];
  alternatives: ComponentAlternative[];
  imageUrl?: string | null;
  isActive: boolean;
}

export const SEED_COMPONENTS: SeedComponentItem[] = [
  {
    slug: 'esp32',
    name: 'ESP32 İnkişaf Lövhəsi',
    aliases: [
      'ESP32',
      'ESP32-WROOM-32D',
      'ESP32-WROOM-32D İnkişaf Lövhəsi',
      'ESP32-S3',
      'ESP32-S3 WROOM Lövhəsi',
      'ESP32 Node',
      'ESP32 NodeMCU',
      'ESP32 DevKit v1',
      'ESP-32',
    ],
    category: 'microcontrollers',
    categoryLabel: 'Mikrokontrollerlər',
    shortDescription:
      'Daxili Wi-Fi və Bluetooth Low Energy dəstəyinə malik ikinüvəli 32-bit IoT mikrokontroller platforması.',
    definition:
      'ESP32 Espressif Systems tərəfindən hazırlanmış, 240 MHz tezlikdə işləyən ikinüvəli Xtensa LX6 prosessorlu, daxili Wi-Fi (802.11 b/g/n) və Bluetooth/BLE rabitə modullarını birləşdirən güclü mikrokontrollerdir. Tələbə laboratoriyalarından sənaye telemetriya sistemlərinə qədər geniş tətbiq olunur.',
    workingPrinciple:
      'İki müstəqil nüvədən biri (PRO_CPU) adətən Wi-Fi/Bluetooth şəbəkə stekini və FreeRTOS əməliyyat sistemini idarə edir, digər nüvə (APP_CPU) isə istifadəçi proqramını (sensorların oxunması, PWM, I2C/SPI/UART əlaqəsi) icra edir. Daxili 12-bit ADC çeviriciləri analoq siqnalları rəqəmsal qiymətə çevirir, hardware kəsilmələri və dərin yuxu (Deep Sleep) rejimi isə batareya ilə işləyən cihazlarda enerji sərfiyyatını mikroamper səviyyəsinə endirir.',
    applications: [
      'Ağıllı ev idarəetmə panelləri və MQTT sensor düyünləri',
      'Bulud əsaslı hava keyfiyyəti və temperatur monitorinq stansiyaları',
      'Wi-Fi üzərindən real vaxt telemetriya və rele idarəetmə sistemləri',
      'Bluetooth BLE əsaslı portativ sağlamlıq və fitnes cihazları',
    ],
    specs: [
      { label: 'Prosessor', value: 'İkinüvəli Xtensa 32-bit LX6, 240 MHz-ə qədər' },
      { label: 'İş gərginliyi (Logic)', value: '3.3V DC (USB/VIN girişi 5V)' },
      { label: 'Yaddaş', value: '520 KB SRAM, 4 MB Flash (WROOM-32D)' },
      { label: 'Simsiz rabitə', value: 'Wi-Fi 2.4 GHz (802.11 b/g/n), Bluetooth 4.2 / BLE' },
      { label: 'GPIO və interfeyslər', value: '34 proqramlaşdırılan GPIO, 18× 12-bit ADC, 2× DAC, 3× UART, SPI, I2C' },
      { label: 'Dərin yuxu cərəyanı', value: '~10 µA (Deep Sleep rejimində)' },
    ],
    pinout: [
      { pin: 'VIN / 5V', name: '5V Güc Girişi', function: 'Lövhəni xarici 5V mənbə ilə qidalandırmaq üçün', type: 'power' },
      { pin: '3V3', name: '3.3V Çıxış', function: 'Daxili tənzimləyicidən stabil 3.3V sensor qidası', type: 'power' },
      { pin: 'GND', name: 'Torpaq (Ground)', function: 'Ümumi mənfi sıfır potensial xətti', type: 'ground' },
      { pin: 'GPIO21 / GPIO22', name: 'I2C (SDA / SCL)', function: 'OLED ekranlar, BMP280, BME680 üçün standart I2C şini', type: 'data' },
      { pin: 'GPIO32–GPIO39', name: 'ADC1 Girişləri', function: 'Wi-Fi aktiv olduqda belə sabit işləyən analoq girişlər', type: 'analog' },
      { pin: 'GPIO2', name: 'Daxili LED / Boot', function: 'Lövhə üzərindəki mavi test LED-inə qoşuludur', type: 'digital' },
    ],
    wiringGuide:
      'ESP32 lövhəsini USB kabel ilə kompüterə qoşun. Bütün GPIO pinləri maksimum 3.3V məntiq səviyyəsi ilə işləyir; 5V çıxışlı sensorları (məsələn, HC-SR04 Echo xəttini) birbaşa qoşarkən gərginlik bölücü (1kΩ + 2kΩ rezistor) və ya məntiq səviyyə çeviricisi (level shifter) istifadə edin. I2C cihazları üçün SDA-nı GPIO21, SCL-i isə GPIO22 pininə qoşun.',
    codeExample: {
      language: 'cpp',
      title: 'ESP32 Wi-Fi və Daxili LED Blink Nümunəsi (Arduino IDE)',
      code: `#include <WiFi.h>

const int LED_PIN = 2;

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  WiFi.mode(WIFI_STA);
  Serial.println("ESP32 hazırdır!");
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  delay(500);
}`,
    },
    pros: [
      'Daxili Wi-Fi və Bluetooth əlavə modul tələb etmir',
      'Yüksək hesablama gücü (240 MHz) və zəngin periferiya dəstəyi',
      'Arduino IDE, PlatformIO, ESP-IDF və MicroPython ilə proqramlaşdırılır',
    ],
    limitations: [
      'GPIO pinləri 5V tolerant deyil (yalnız 3.3V məntiq)',
      'Wi-Fi aktiv olduqda ADC2 kanalları analoq oxuma üçün istifadə oluna bilməz',
      'Wi-Fi ötürülməsi zamanı ani cərəyan sıçrayışları (500 mA+) sabit qida tələb edir',
    ],
    alternatives: [
      { slug: 'arduino-uno', name: 'Arduino Uno R3', reason: '5V tolerant pinlər və sadə başlanğıc öyrənmə üçün' },
      { slug: 'stm32f4', name: 'STM32F401 BlackPill', reason: 'Simsiz rabitə lazım olmadıqda yüksək dəqiqlikli DSP/ADC tapşırıqları üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'arduino-uno',
    name: 'Arduino Uno R3',
    aliases: [
      'Arduino Uno',
      'Arduino Uno R3',
      'Arduino Uno R3 (ATmega328P)',
      'Arduino Uno (ATmega328P)',
      'ATmega328P',
    ],
    category: 'microcontrollers',
    categoryLabel: 'Mikrokontrollerlər',
    shortDescription:
      'Təhsil və sürətli prototipləmə üçün ən populyar 8-bit ATmega328P əsaslı mikrokontroller lövhəsi.',
    definition:
      'Arduino Uno R3 Microchip ATmega328P mikrokontrolleri üzərində qurulmuş açıq mənbəli elektronika platformasıdır. Sadə quruluşu, 5V məntiq uyğunluğu və nəhəng kitabxana ekosistemi sayəsində elektronika və robototexnikanı öyrənən tələbələr üçün standart başlanğıc lövhəsidir.',
    workingPrinciple:
      'Lövhə üzərindəki 16 MHz kvars rezonator ATmega328P nüvəsini sinxronlaşdırır. USB-UART çevirici çip (ATmega16U2 və ya CH340) kompüterdən gələn kodu Bootloader vasitəsilə Flash yaddaşa yazır. Daxili 10-bit ADC analoq gərginliyi 0–1023 arası ədədlərə çevirir, 6 rəqəmsal pin isə PWM (~) siqnalları generasiya edir.',
    applications: [
      'Hava stansiyaları və sensor kalibrasiya təcrübələri',
      'Təhsil məqsədli LED, düymə və LCD displey layihələri',
      'Sadə robotlar və servo mexanizm idarəetməsi',
    ],
    specs: [
      { label: 'Mikrokontroller', value: 'ATmega328P (8-bit AVR, 16 MHz)' },
      { label: 'İş gərginliyi', value: '5V DC (VIN girişi 7V–12V tövsiyə olunur)' },
      { label: 'Yaddaş', value: '32 KB Flash, 2 KB SRAM, 1 KB EEPROM' },
      { label: 'Rəqəmsal I/O', value: '14 pin (onlardan 6-sı PWM çıxışı)' },
      { label: 'Analoq girişlər', value: '6 ədəd 10-bit ADC (A0–A5)' },
    ],
    pinout: [
      { pin: '5V / 3.3V', name: 'Qida çıxışları', function: 'Xarici modulları qidalandırmaq üçün stabil 5V və 3.3V', type: 'power' },
      { pin: 'GND', name: 'Torpaq', function: 'Ümumi dövrə torpaqlaması', type: 'ground' },
      { pin: 'D0 / D1', name: 'RX / TX (UART)', function: 'Serial monitor və xarici UART modullar üçün', type: 'data' },
      { pin: 'D3, D5, D6, D9, D10, D11', name: 'PWM Çıxışları', function: 'LED parlaqlığı və motor sürət tənzimləməsi (analogWrite)', type: 'digital' },
      { pin: 'A4 / A5', name: 'SDA / SCL (I2C)', function: 'I2C ekran və sensor bağlantıları', type: 'data' },
    ],
    wiringGuide:
      'USB Type-B kabeli ilə kompüterə qoşun. Sensorları 5V və GND şinlərinə bağlayın. I2C modullar üçün A4 (SDA) və A5 (SCL) pinlərindən istifadə edin. Hər bir I/O pinindən maksimum 20–40 mA cərəyan çəkmək olar; yüksək cərəyanlı yüklər üçün tranzistor və ya rele istifadə edin.',
    codeExample: {
      language: 'cpp',
      title: 'Arduino Uno Analoq Sensor və PWM LED İdarəetməsi',
      code: `const int SENSOR_PIN = A0;
const int LED_PIN = 9;

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  int raw = analogRead(SENSOR_PIN);
  int pwm = map(raw, 0, 1023, 0, 255);
  analogWrite(LED_PIN, pwm);
  Serial.println(raw);
  delay(200);
}`,
    },
    pros: [
      'Çox sadə və öyrənmək üçün ideal arxitektura',
      '5V tolerant pinlər əksər sensorlarla birbaşa uyğundur',
      'Zədələnərsə DIP ATmega328P çipini dəyişdirmək mümkündür',
    ],
    limitations: [
      'Daxili Wi-Fi və Bluetooth rabitəsi yoxdur',
      '2 KB SRAM yaddaş iri qrafik displeylər və şəbəkə buferləri üçün məhduddur',
    ],
    alternatives: [
      { slug: 'arduino-nano', name: 'Arduino Nano V3', reason: 'Eyni ATmega328P gücü ilə breadboard üzərinə birbaşa taxılan kompakt ölçü üçün' },
      { slug: 'esp32', name: 'ESP32', reason: 'Wi-Fi/BLE və daha böyük yaddaş tələb edən IoT layihələri üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'arduino-nano',
    name: 'Arduino Nano V3',
    aliases: [
      'Arduino Nano',
      'Arduino Nano V3',
      'Arduino Nano V3 (ATmega328P CH340)',
      'Arduino Nano V3 (ATmega328P)',
      'Arduino Nano (ATmega328P CH340)',
      'Arduino Nano (ATmega328P)',
    ],
    category: 'microcontrollers',
    categoryLabel: 'Mikrokontrollerlər',
    shortDescription:
      'Breadboard üzərinə birbaşa yerləşdirilən kompakt ölçülü ATmega328P mikrokontroller lövhəsi.',
    definition:
      'Arduino Nano V3 Arduino Uno ilə demək olar ki, eyni elektronika və proqram uyğunluğuna malik olan, lakin kiçik ölçüləri sayəsində birbaşa breadboard və ya xüsusi PCB üzərinə taxıla bilən mikrokontroller moduludur.',
    workingPrinciple:
      'ATmega328P mikrokontrolleri 16 MHz tezlikdə çalışır və CH340/FT232 USB-Serial körpüsü vasitəsilə proqramlaşdırılır. Arduino Uno-dan fərqli olaraq SMD korpuslu çipdən istifadə etdiyi üçün əlavə 2 analoq giriş (A6 və A7) də təqdim edir.',
    applications: [
      'Avtomatik bitki suvarma və kiçik ölçülü ev avtomatlaşdırması',
      'Geyilə bilən elektronika və portativ sensor ölçmə cihazları',
      'Breadboard əsaslı laboratoriya maketləri',
    ],
    specs: [
      { label: 'Mikrokontroller', value: 'ATmega328P (5V / 16 MHz)' },
      { label: 'Ölçülər', value: '45 mm × 18 mm (Breadboard uyğun)' },
      { label: 'Analoq girişlər', value: '8 ədəd (A0–A7; A6 və A7 yalnız analoq oxuma üçündür)' },
      { label: 'Yaddaş', value: '32 KB Flash, 2 KB SRAM, 1 KB EEPROM' },
      { label: 'USB interfeysi', value: 'Mini-USB / Micro-USB / Type-C (CH340 sürücü ilə)' },
    ],
    pinout: [
      { pin: 'VIN', name: 'Tənzimlənməmiş Giriş', function: '7V–12V DC xarici qida mənbəyi üçün', type: 'power' },
      { pin: '5V / GND', name: 'Qida Şini', function: 'Stabil 5V çıxış/giriş və ümumi torpaq', type: 'power' },
      { pin: 'A0–A7', name: 'Analoq Girişlər', function: 'Torpaq rütubəti kimi analoq sensor siqnallarını oxumaq üçün', type: 'analog' },
      { pin: 'A4 / A5', name: 'SDA / SCL', function: 'I2C rabitə interfeysi', type: 'data' },
      { pin: 'D2–D13', name: 'Rəqəmsal I/O', function: 'Rele, düymə, LED və PWM çıxışları', type: 'digital' },
    ],
    wiringGuide:
      'Lövhəni breadboard-un mərkəzi xəttinin üzərinə oturdun ki, hər iki sıradakı pinlər qısaqapanmasın. CH340 klon lövhələrdə Arduino IDE-də "Tools -> Processor -> ATmega328P (Old Bootloader)" seçimini yoxlayın.',
    codeExample: {
      language: 'cpp',
      title: 'Arduino Nano Rütubət Sensoru Oxuma Nümunəsi',
      code: `const int SOIL_PIN = A0;
const int RELAY_PIN = 4;

void setup() {
  Serial.begin(9600);
  pinMode(RELAY_PIN, OUTPUT);
}

void loop() {
  int val = analogRead(SOIL_PIN);
  Serial.print("Sensor dəyəri: ");
  Serial.println(val);
  digitalWrite(RELAY_PIN, val > 600 ? HIGH : LOW);
  delay(1000);
}`,
    },
    pros: [
      'Çox kiçik ölçü və breadboard-a birbaşa taxılma imkanı',
      'Arduino Uno kodları ilə 100% uyğunluq',
      'Uno-dan fərqli olaraq 8 analoq giriş (A0–A7)',
    ],
    limitations: [
      'Yüksək cərəyanlı mühərrik və ya nasosları birbaşa qidalandıra bilməz',
      'CH340 klon modellərdə əlavə USB sürücüsü quraşdırmaq tələb oluna bilər',
    ],
    alternatives: [
      { slug: 'arduino-uno', name: 'Arduino Uno R3', reason: 'Shield lövhələri ilə uyğunluq üçün' },
      { slug: 'esp32', name: 'ESP32 DevKit', reason: 'Simsiz əlaqə və daha çox hesablama gücü üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'raspberry-pi-4',
    name: 'Raspberry Pi 4 Model B',
    aliases: [
      'Raspberry Pi 4',
      'Raspberry Pi 4 Model B',
      'Raspberry Pi 4 Model B (4GB RAM)',
      'Raspberry Pi 4 (4GB RAM)',
      'Raspberry Pi 4B',
      'RPi 4',
    ],
    category: 'microcontrollers',
    categoryLabel: 'Mikrokontrollerlər',
    shortDescription:
      'Linux əməliyyat sistemi, OpenCV görüntü emalı və Python layihələri üçün dördnüvəli tək-lövhəli kompüter (SBC).',
    definition:
      'Raspberry Pi 4 Model B 64-bit dördnüvəli ARM Cortex-A72 prosessoru, 2–8 GB LPDDR4 RAM yaddaşı və 40 pinli GPIO başlığı ilə təchiz olunmuş tam funksional tək-lövhəli mini kompüterdir. Süni intellekt, kompüter görməsi (OpenCV) və yerli IoT serverlər üçün idealdır.',
    workingPrinciple:
      'Mikrokontrollerlərdən fərqli olaraq Raspberry Pi microSD kartdan tam Linux (Raspberry Pi OS) əməliyyat sistemini yükləyir. İstifadəçi Python, C++, Docker və ya Node.js tətbiqlərini paralel işlədə, eyni zamanda 40-pinli GPIO interfeysi vasitəsilə motor sürücüləri, sensorlar və kameralarla əlaqə qura bilər.',
    applications: [
      'OpenCV ilə real vaxt kamera görüntü emalı və obyekt tanıma robotları',
      'Home Assistant və Mosquitto MQTT yerli ağıllı ev serverləri',
      'Edge AI (TensorFlow Lite) və sənaye məlumat toplama gateway-ləri',
    ],
    specs: [
      { label: 'Prosessor', value: 'Broadcom BCM2711, 4× ARM Cortex-A72 (1.5 GHz)' },
      { label: 'Operativ yaddaş', value: '4 GB LPDDR4-3200 SDRAM' },
      { label: 'Şəbəkə', value: 'Gigabit Ethernet, Dual-band Wi-Fi (2.4/5 GHz), Bluetooth 5.0' },
      { label: 'Video və USB', value: '2× micro-HDMI (4K), CSI kamera portu, 2× USB 3.0, 2× USB 2.0' },
      { label: 'Qida tələbi', value: '5V 3A USB-C (GPIO məntiq səviyyəsi 3.3V)' },
    ],
    pinout: [
      { pin: 'Pin 2 / 4', name: '5V Güc', function: '5V güc çıxışı (cərəyan adapterdən asılıdır)', type: 'power' },
      { pin: 'Pin 1 / 17', name: '3.3V Güc', function: 'Sensorlar üçün stabil 3.3V', type: 'power' },
      { pin: 'Pin 6, 9, 14, 20', name: 'GND', function: 'Ümumi torpaq pinləri', type: 'ground' },
      { pin: 'GPIO2 / GPIO3 (Pin 3, 5)', name: 'I2C1 SDA/SCL', function: 'OLED, sensor və ADC genişləndirmə modulları üçün', type: 'data' },
      { pin: 'GPIO12, 13, 18, 19', name: 'Hardware PWM', function: 'Servo və motor sürücü sürət tənzimləməsi üçün', type: 'digital' },
    ],
    wiringGuide:
      'Düzgün 5V 3A USB-C adapter istifadə edin. GPIO pinləri 3.3V məntiqlə işləyir və qorunmayıb — qısaqapanma lövhəni sıradan çıxara bilər. Daxili analoq giriş (ADC) olmadığı üçün analoq sensorlar üçün xarici ADS1115/MCP3008 kimi I2C/SPI ADC modulu lazımdır.',
    codeExample: {
      language: 'python',
      title: 'Raspberry Pi GPIO PWM Motor Sürət Nümunəsi (gpiozero)',
      code: `from gpiozero import PWMOutputDevice
from time import sleep

motor_pwm = PWMOutputDevice(18)

while True:
    motor_pwm.value = 0.6  # 60% sürət
    sleep(2)
    motor_pwm.value = 0.0
    sleep(1)`,
    },
    pros: [
      'Tam Linux OS, OpenCV, Python və yüksək səviyyəli kitabxana dəstəyi',
      'CSI kamera portu ilə aşağı gecikməli video axını',
      '4 GB RAM çoxsaylı xidmətləri paralel icra etməyə imkan verir',
    ],
    limitations: [
      'Daxili analoq-rəqəmsal çevirici (ADC) yoxdur',
      'Mikrokontrollerlərə nisbətən yüksək enerji sərfiyyatı (3–7W) və boot müddəti',
    ],
    alternatives: [
      { slug: 'esp32', name: 'ESP32', reason: 'Aşağı enerji sərfiyyatlı və ani açılan sensor düyünləri üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'stm32f4',
    name: 'STM32F401 BlackPill',
    aliases: [
      'STM32F4',
      'STM32F401',
      'STM32F401CCU6',
      'STM32F401CCU6 BlackPill Lövhəsi',
      'STM32F401 (BlackPill)',
      'STM32F401CCU6 (BlackPill)',
      'BlackPill',
    ],
    category: 'microcontrollers',
    categoryLabel: 'Mikrokontrollerlər',
    shortDescription:
      'ARM Cortex-M4F nüvəli, 84 MHz tezlikli, DSP və DMA imkanlı yüksək sürətli mikrokontroller lövhəsi.',
    definition:
      'STM32F401CCU6 (BlackPill) STMicroelectronics-in 32-bit ARM Cortex-M4 prosessoruna əsaslanan, daxili Floating Point Unit (FPU) və yüksək sürətli DMA/ADC modullarına malik inkişaf lövhəsidir. Siqnal emalı, rəqəmsal osilloqraflar və sənaye nəzarətçiləri üçün seçilir.',
    workingPrinciple:
      'Cortex-M4 nüvəsi bir taktda vurma-toplama (MAC) əməliyyatlarını və DMA (Direct Memory Access) vasitəsilə CPU-nu yükləmədən ADC-dən RAM-a birbaşa məlumat köçürməsini dəstəkləyir. Bu da saniyədə yüz minlərlə nümunə (MSPS) toplamağa imkan verir.',
    applications: [
      'Portativ rəqəmsal osilloqraflar və siqnal generatorları',
      'Sənaye PLC modulları və Modbus RTU nəzarətçiləri',
      'Yüksək tezlikli PID motor idarəetmə sistemləri',
    ],
    specs: [
      { label: 'Nüvə', value: 'ARM Cortex-M4 32-bit FPU ilə (84 MHz)' },
      { label: 'Yaddaş', value: '256 KB Flash, 64 KB SRAM' },
      { label: 'ADC', value: '12-bit, 2.4 MSPS-ə qədər sürətli çevirici (10 kanal)' },
      { label: 'İnterfeyslər', value: 'USB Type-C OTG, 3× USART, 3× I2C, 4× SPI' },
      { label: 'İş gərginliyi', value: '3.3V məntiq (əksər pinlər 5V tolerant)' },
    ],
    pinout: [
      { pin: '5V / 3.3V / GND', name: 'Qida', function: 'USB-C 5V girişi və 3.3V stabilizator çıxışı', type: 'power' },
      { pin: 'PA0–PA7, PB0–PB1', name: 'ADC Kanalları', function: '12-bit yüksək sürətli analoq ölçmə girişləri', type: 'analog' },
      { pin: 'PA5 / PA7 / PB10', name: 'SPI1 (SCK / MOSI / SC)', function: 'TFT ILI9341 ekranı yüksək sürətlə idarə etmək üçün', type: 'data' },
      { pin: 'SWDIO / SWCLK', name: 'Debug Portu', function: 'ST-Link V2 proqramatoru üçün', type: 'data' },
    ],
    wiringGuide:
      'STM32CubeIDE və ST-Link V2 proqramatoru ilə SWDIO, SWCLK, GND və 3.3V xətlərini birləşdirərək proqramlaşdırın. Analoq girişlərə verilən gərginlik 3.3V-u aşmamalıdır.',
    codeExample: {
      language: 'c',
      title: 'STM32 HAL ADC + DMA Başlatma Nümunəsi',
      code: `// STM32CubeIDE HAL ilə DMA üzərindən ADC oxunması
uint16_t adcBuffer[256];

void startScopeCapture(ADC_HandleTypeDef *hadc1) {
  HAL_ADC_Start_DMA(hadc1, (uint32_t*)adcBuffer, 256);
}`,
    },
    pros: [
      'Yüksək sürətli 12-bit ADC və DMA dəstəyi',
      'Hardware üzən nöqtəli hesablama (FPU) sayəsində sürətli FFT/filtrasiya',
      'Kompakt USB-C form-faktor və aşağı qiymət',
    ],
    limitations: [
      'Arduino ekosisteminə nisbətən sazlama və register/HAL konfiqurasiyası daha mürəkkəbdir',
      'Daxili Wi-Fi və Bluetooth modulu yoxdur',
    ],
    alternatives: [
      { slug: 'stm32h7', name: 'STM32H7', reason: '480 MHz tezlik və dron avtopilotu kimi ağır real-vaxt hesablamaları üçün' },
      { slug: 'esp32', name: 'ESP32', reason: 'Wi-Fi/BLE bağlantısı tələb olunduqda' },
    ],
    isActive: true,
  },
  {
    slug: 'stm32h7',
    name: 'STM32H7 Yüksək Performanslı MCU',
    aliases: ['STM32H7', 'STM32H743'],
    category: 'microcontrollers',
    categoryLabel: 'Mikrokontrollerlər',
    shortDescription:
      '480 MHz ARM Cortex-M7 nüvəli, dron avtopilotları və ağır real-vaxt sistemləri üçün flaqman mikrokontroller.',
    definition:
      'STM32H7 seriyası STMicroelectronics-in ən güclü ARM Cortex-M7 arxitekturalı mikrokontroller ailəsidir. Çift dəqiqlikli FPU, L1 keş yaddaşı və çoxsaylı UART/SPI/CAN-FD interfeysləri ilə peşəkar dron uçuş nəzarətçilərində (Betaflight/INAV/ArduPilot) istifadə olunur.',
    workingPrinciple:
      '480 MHz takt tezliyi və 16 KB L1 təlimat/məlumat keşi mikrokontrollerə IMU sensorlarından (giroskop, akselerometr) gələn minlərlə hertz tezlikli məlumatları Kalman filtri və PID tənzimləyicisi ilə anlıq emal etməyə imkan verir.',
    applications: [
      'Fırçasız motorlu dron avtopilot lövhələri (Flight Controllers)',
      'Yüksək tezlikli audio DSP və qrafik HMI panelləri',
      'Sənaye CAN-FD və Ethernet rabitə nəzarətçiləri',
    ],
    specs: [
      { label: 'Nüvə', value: 'ARM Cortex-M7 (480 MHz-ə qədər), DP-FPU' },
      { label: 'Yaddaş', value: '2 MB-a qədər Flash, 1 MB RAM' },
      { label: 'Rabitə', value: '8× UART/USART, 6× SPI, 4× I2C, CAN-FD, SDMMC' },
      { label: 'ADC', value: '3× 16-bit ADC (3.6 MSPS-ə qədər)' },
    ],
    pinout: [
      { pin: 'VDD / VSS', name: '3.3V Qida', function: 'Təmiz süzülmüş 3.3V rəqəmsal və VDDA analoq qidası', type: 'power' },
      { pin: 'SPI / I2C', name: 'Sensor Şinləri', function: 'Yüksək sürətli IMU və barometr bağlantısı', type: 'data' },
      { pin: 'TIM1–TIM8', name: 'DShot / PWM', function: 'ESC motor sürücülərinə yüksək tezlikli idarəetmə siqnalı', type: 'digital' },
    ],
    wiringGuide:
      'PCB dizaynında VDDA analoq qida xəttini ferrit muncuq və 100nF/1µF kondensatorlarla ayırın. Dron uçuş nəzarətçilərində 5V BEC stabilizatorundan qidalandırın və USB/SWD üzərindən firmware yükləyin.',
    codeExample: {
      language: 'c',
      title: 'STM32H7 DShot / PWM Taymer Konfiqurasiyası',
      code: `// Yüksək tezlikli PWM çıxışını aktivləşdirmə (STM32 HAL)
HAL_TIM_PWM_Start(&htim1, TIM_CHANNEL_1);
__HAL_TIM_SET_COMPARE(&htim1, TIM_CHANNEL_1, 1500); // Orta qaz siqnalı`,
    },
    pros: [
      'Mikrokontroller sinfində fövqəladə hesablama sürəti (480 MHz)',
      '16-bit dəqiqlikli ADC və çoxlu DMA kanalları',
      'CAN-FD və yüksək sürətli SPI dəstəyi',
    ],
    limitations: [
      'LQFP/BGA korpuslar əl ilə prototipləmə üçün çətindir (xüsusi PCB tələb edir)',
      'Yüksək tezlik səbəbindən qida zəncirində dekuplinq qaydalarına ciddi əməl olunmalıdır',
    ],
    alternatives: [
      { slug: 'stm32f4', name: 'STM32F401', reason: 'Daha ucuz və sadə laboratoriya ölçü cihazları üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'dht22',
    name: 'DHT22 (AM2302) Temperatur və Rütubət Sensoru',
    aliases: [
      'DHT22',
      'AM2302',
      'DHT22 (AM2302)',
      'AM2302 (DHT22)',
      'DHT22 Sensor',
      'DHT22 (AM2302) Rütubət və Temperatur Sensoru',
      'DHT22 Temperatur və Rütubət Sensoru',
    ],
    category: 'sensors',
    categoryLabel: 'Sensorlar',
    shortDescription:
      'Yüksək dəqiqlikli rəqəmsal nisbi rütubət (0–100%) və temperatur (-40°C ~ +80°C) ölçmə sensoru.',
    definition:
      'DHT22 (AM2302) kalibrlənmiş rəqəmsal çıxışlı kombinə edilmiş temperatur və rütubət sensorudur. Daxilində kapasitiv rütubət elementi, NTC termistor və ölçməni rəqəmsal pakete çevirən 8-bit mikroçip yerləşir.',
    workingPrinciple:
      'Sensor tək məlumat xətti (Single-Bus) protokolu ilə işləyir. Mikrokontroller DATA xəttini qısa müddətə aşağı (LOW) çəkərək başlanğıc siqnalı göndərir, bundan sonra DHT22 40-bitlik məlumat paketini (16-bit rütubət, 16-bit temperatur, 8-bit yoxlama cəmi / checksum) ardıcıl impulslar şəklində geri qaytarır.',
    applications: [
      'Hava stansiyaları və istixana mikroiqlim nəzarəti',
      'Server otaqları və anbarlarda temperatur/rütubət monitorinqi',
      'Ağıllı ev kondisioner və nəmləndirici avtomatlaşdırması',
    ],
    specs: [
      { label: 'Qida gərginliyi', value: '3.3V – 5.5V DC' },
      { label: 'Temperatur diapazonu', value: '-40°C ... +80°C (±0.5°C dəqiqlik)' },
      { label: 'Rütubət diapazonu', value: '0% ... 100% RH (±2% RH dəqiqlik)' },
      { label: 'Ölçmə tezliyi', value: 'Maksimum 0.5 Hz (hər 2 saniyədən bir)' },
      { label: 'İnterfeys', value: '1-naqilli xüsusi rəqəmsal protokol (One-Wire deyil)' },
    ],
    pinout: [
      { pin: '1 (VCC)', name: 'Qida Girişi', function: '3.3V və ya 5V müsbət qida', type: 'power' },
      { pin: '2 (DATA)', name: 'Məlumat Xətti', function: 'İki istiqamətli rəqəmsal siqnal (4.7kΩ–10kΩ pull-up tələb edir)', type: 'data' },
      { pin: '3 (NC)', name: 'Boş Pin', function: 'Qoşulmur (3-pinli PCB modullarda olmur)', type: 'digital' },
      { pin: '4 (GND)', name: 'Torpaq', function: 'Mənfi qida xətti', type: 'ground' },
    ],
    wiringGuide:
      'VCC pinini 3.3V və ya 5V-a, GND pinini torpağa bağlayın. DATA pinini mikrokontrollerin rəqəmsal pininə (məs. D2 və ya GPIO4) qoşun. Çılpaq 4-pinli sensorda VCC və DATA arasına 4.7kΩ–10kΩ pull-up rezistoru qoyun (3-pinli hazır modullarda rezistor artıq lövhə üzərində olur).',
    codeExample: {
      language: 'cpp',
      title: 'DHT22 Temperatur və Rütubət Oxuma (DHT kitabxanası)',
      code: `#include <DHT.h>
#define DHTPIN 2
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  delay(2000);
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (!isnan(h) && !isnan(t)) {
    Serial.printf("Temp: %.1f C, Rütubət: %.1f %%\\n", t, h);
  }
}`,
    },
    pros: [
      'DHT11-ə nisbətən geniş diapazon və yüksək dəqiqlik (±2% RH)',
      'Zavodda kalibrlənmiş rəqəmsal çıxış — əlavə ADC tələb etmir',
      '3.3V (ESP32) və 5V (Arduino) sistemlərlə uyğundur',
    ],
    limitations: [
      'Ölçmə sürəti yavaşdır — yeni dəyər üçün minimum 2 saniyə gözləmək lazımdır',
      'Sürətli kondensasiya olan mühitlərdə əlavə qoruyucu filtr tələb edir',
    ],
    alternatives: [
      { slug: 'bme680', name: 'BME680', reason: 'Eyni zamanda atmosfer təzyiqi və VOC qaz keyfiyyətini I2C ilə ölçmək üçün' },
      { slug: 'ds18b20', name: 'DS18B20', reason: 'Yalnız temperatur və suya davamlı prob lazım olduqda' },
    ],
    isActive: true,
  },
  {
    slug: 'bmp280',
    name: 'BMP280 Barometrik Təzyiq Sensoru',
    aliases: ['BMP280', 'GY-BMP280', 'BMP280 (GY-BMP280)', 'BMP280 Barometrik Təzyiq Sensoru'],
    category: 'sensors',
    categoryLabel: 'Sensorlar',
    shortDescription:
      'Bosch istehsalı yüksək dəqiqlikli I2C/SPI atmosfer təzyiqi, temperatur və hündürlük hesablayan sensor.',
    definition:
      'BMP280 piezorezistiv texnologiya əsasında hazırlanmış ultra-kompakt barometrik təzyiq və temperatur sensorudur. Dəniz səviyyəsindən hündürlüyü ~1 metr dəqiqliklə təxmin edə bildiyi üçün hava stansiyalarında və dronlarda geniş istifadə olunur.',
    workingPrinciple:
      'Atmosfer təzyiqi dəyişdikdə sensorun daxilindəki nazik silisium membranı əyilir və körpü müqavimətini dəyişdirir. Daxili 20-bit ADC bu siqnali rəqəmsallaşdırır və EEPROM-da saxlanan kalibrasiya əmsalları ilə kompensasiya olunmuş təzyiq (hPa) hesablanır.',
    applications: [
      'Hava proqnozu və meteoroloji stansiyalar',
      'Dron və raket modellərində altimetr (hündürlükölçən)',
      'Mərtəbə təyini və qapalı məkan naviqasiyası',
    ],
    specs: [
      { label: 'Qida gərginliyi', value: '1.8V – 3.6V DC (GY-BMP280 5V modulları tənzimləyicili olur)' },
      { label: 'Təzyiq diapazonu', value: '300 – 1100 hPa (±0.12 hPa nisbi dəqiqlik)' },
      { label: 'İnterfeys', value: 'I2C (ünvan 0x76 və ya 0x77) və SPI' },
      { label: 'Cərəyan sərfiyyatı', value: '2.7 µA @ 1 Hz' },
    ],
    pinout: [
      { pin: 'VCC', name: 'Qida', function: '3.3V qida girişi (bəzi breakout lövhələrdə 5V dəstəyi yoxdur!)', type: 'power' },
      { pin: 'GND', name: 'Torpaq', function: 'Mənfi sıfır xətti', type: 'ground' },
      { pin: 'SCL / SDA', name: 'I2C Saat / Məlumat', function: 'Mikrokontrollerin I2C pinlərinə qoşulur', type: 'data' },
      { pin: 'SDO', name: 'I2C Ünvan Seçimi', function: 'GND-yə qoşulduqda 0x76, VCC-yə qoşulduqda 0x77 ünvanı seçilir', type: 'digital' },
    ],
    wiringGuide:
      'Standart GY-BMP280 modulunu 3.3V pinindən qidalandırın (5V verilməsi çipi yandıra bilər). SDA və SCL xətlərini Arduino-da A4/A5, ESP32-də isə GPIO21/GPIO22 pinlərinə qoşun. Kodda ünvan 0x76 işləməzsə 0x77 yoxlayın.',
    codeExample: {
      language: 'cpp',
      title: 'BMP280 I2C Təzyiq və Hündürlük Oxuma',
      code: `#include <Adafruit_BMP280.h>
Adafruit_BMP280 bmp;

void setup() {
  Serial.begin(9600);
  if (!bmp.begin(0x76)) {
    Serial.println("BMP280 tapılmadı!");
    while (1);
  }
}

void loop() {
  Serial.print("Təzyiq: ");
  Serial.print(bmp.readPressure() / 100.0F);
  Serial.println(" hPa");
  delay(1000);
}`,
    },
    pros: [
      'Çox aşağı enerji sərfiyyatı və kiçik ölçü',
      'Həm I2C, həm də sürətli SPI interfeysi',
      '~1 m hündürlük dəyişikliyini hiss edə bilir',
    ],
    limitations: [
      'Rütubət ölçmür (rütubət üçün BME280/BME680 lazımdır)',
      'Əksər ucuz modullar yalnız 3.3V məntiqlə işləyir',
    ],
    alternatives: [
      { slug: 'bme680', name: 'BME680', reason: 'Təzyiqə əlavə olaraq rütubət və VOC qaz sensoru da lazım olduqda' },
    ],
    isActive: true,
  },
  {
    slug: 'ds18b20',
    name: 'DS18B20 Suya Davamlı İstilik Sensoru',
    aliases: ['DS18B20', 'DS18B20 Paslanmayan Polad İstilik Sensoru', 'DS18B20 Temperatur Sensoru'],
    category: 'sensors',
    categoryLabel: 'Sensorlar',
    shortDescription:
      '1-Wire protokollu, unikal 64-bit ünvanlı və paslanmayan polad zondlu dəqiq temperatur sensoru.',
    definition:
      'DS18B20 Maxim Integrated tərəfindən istehsal olunan, bir tək məlumat naqili (Dallas 1-Wire) üzərindən işləyən rəqəmsal temperatur sensorudur. Paslanmayan polad ucluqlu versiyası mayelərin, boruların və torpağın temperaturunu birbaşa ölçməyə imkan verir.',
    workingPrinciple:
      'Sensorun daxilindəki iki osilyator temperaturdan asılı olaraq fərqli tezliklərdə dəyişir və onların fərqi 9–12 bitlik rəqəmsal temperatur qiymətinə çevrilir. Hər çipin zavodda yazılmış unikal 64-bit seriya nömrəsi olduğundan eyni məlumat naqilinə onlarla sensoru paralel qoşmaq mümkündür.',
    applications: [
      'Sənaye maye çənləri, kombi və istilik sistemlərinin monitorinqi',
      'Akvarium, hidroponika və istixana temperatur nəzarəti',
      'Uzun kabel məsafələrində çoxnöqtəli istilik ölçmə şəbəkələri',
    ],
    specs: [
      { label: 'Ölçmə diapazonu', value: '-55°C ... +125°C (±0.5°C dəqiqlik -10°C...+85°C arası)' },
      { label: 'Qida gərginliyi', value: '3.0V – 5.5V DC (və ya Parasite Power)' },
      { label: 'İnterfeys', value: '1-Wire (tək rəqəmsal xətt, 4.7kΩ pull-up ilə)' },
      { label: 'Ayırdetmə', value: '9, 10, 11 və ya 12-bit proqramlaşdırılan' },
    ],
    pinout: [
      { pin: 'Qırmızı naqil (VCC)', name: 'Qida', function: '3.3V–5V müsbət gərginlik', type: 'power' },
      { pin: 'Sarı/Ağ naqil (DQ)', name: '1-Wire Məlumat', function: 'Rəqəmsal data xətti (4.7kΩ pull-up rezistoru vacibdir)', type: 'data' },
      { pin: 'Qara naqil (GND)', name: 'Torpaq', function: 'Ümumi mənfi xətt', type: 'ground' },
    ],
    wiringGuide:
      'Qırmızı naqili 3.3V/5V-a, qara naqili GND-yə, sarı məlumat naqilini isə rəqəmsal GPIO pininə qoşun. VCC ilə məlumat naqili arasına mütləq 4.7kΩ pull-up rezistoru bağlayın, əks halda sensor -127°C oxuyacaq.',
    codeExample: {
      language: 'cpp',
      title: 'DS18B20 OneWire Temperatur Oxunması',
      code: `#include <OneWire.h>
#include <DallasTemperature.h>

OneWire oneWire(4);
DallasTemperature sensors(&oneWire);

void setup() {
  Serial.begin(115200);
  sensors.begin();
}

void loop() {
  sensors.requestTemperatures();
  Serial.print("Temperatur: ");
  Serial.println(sensors.getTempCByIndex(0));
  delay(1000);
}`,
    },
    pros: [
      'Paslanmayan polad zond suya və nəmə tam davamlıdır',
      'Tək naqilə çoxlu sensor qoşma imkanı (unikal 64-bit ROM ID)',
      'Uzun kabel xətlərində analoq sensorlar kimi siqnal itkisi olmur',
    ],
    limitations: [
      '12-bit dəqiqlikdə çevirmə müddəti ~750 ms çəkir',
      '4.7kΩ pull-up rezistoru olmadan sabit işləmir',
    ],
    alternatives: [
      { slug: 'dht22', name: 'DHT22', reason: 'Hava temperaturu ilə yanaşı rütubət də ölçmək lazım olduqda' },
    ],
    isActive: true,
  },
  {
    slug: 'bme680',
    name: 'BME680 Qaz, Rütubət və Təzyiq Sensoru',
    aliases: ['BME680', 'BME680 Sensor', 'BME680 Qaz və Hava Keyfiyyəti Sensoru'],
    category: 'sensors',
    categoryLabel: 'Sensorlar',
    shortDescription:
      '4-ü 1-də I2C/SPI sensor: temperatur, rütubət, atmosfer təzyiqi və uçucu üzvi birləşmələr (VOC) ölçümü.',
    definition:
      'BME680 Bosch Sensortec-in ağıllı ev və daxili hava keyfiyyəti (IAQ) monitorinqi üçün nəzərdə tutulmuş inteqrasiya olunmuş ekoloji sensorudur. Tək bir kiçik modulda dörd müxtəlif ətraf mühit parametrini ölçür.',
    workingPrinciple:
      'Temperatur, rütubət və təzyiq ölçmələrinə əlavə olaraq, daxildəki Metal Oksid (MOX) qaz elementi qısa müddətli mikro-qızdırıcı ilə isidilir və havadakı uçucu üzvi birləşmələrin (VOC) miqdarından asılı olaraq elektrik müqavimətini dəyişir.',
    applications: [
      'Ağıllı ev hava keyfiyyəti (IAQ) və ventilyasiya sistemləri',
      'Ofis və sinif otaqlarında CO2 ekvivalenti və komfort monitorinqi',
      'Kompakt meteoroloji IoT stansiyaları',
    ],
    specs: [
      { label: 'Ölçülən parametrlər', value: 'Temperatur, Rütubət, Təzyiq, VOC Qaz müqaviməti' },
      { label: 'Qida gərginliyi', value: '1.7V – 3.6V (breakout lövhələr 3.3V/5V LDO ilə)' },
      { label: 'İnterfeys', value: 'I2C (0x76 / 0x77) və SPI' },
      { label: 'Cərəyan (qaz qızdırıcısı aktiv)', value: '2.1 mA – 12 mA (pik)' },
    ],
    pinout: [
      { pin: 'VCC', name: 'Qida', function: '3.3V (və ya tənzimləyicili lövhədə 5V)', type: 'power' },
      { pin: 'GND', name: 'Torpaq', function: 'Ümumi torpaq xətti', type: 'ground' },
      { pin: 'SDA / SCL', name: 'I2C Xətləri', function: 'Məlumat və saat sinxronizasiyası', type: 'data' },
    ],
    wiringGuide:
      'SDA və SCL xətlərini ESP32-də GPIO21/GPIO22 pinlərinə qoşun. Qaz ölçməsinin sabitləşməsi üçün ilk işə salındıqda 20–30 dəqiqə ilkin isinmə (burn-in) müddəti verin.',
    codeExample: {
      language: 'cpp',
      title: 'BME680 Bütün Sensor Göstəricilərinin Oxunması',
      code: `#include <Adafruit_BME680.h>
Adafruit_BME680 bme;

void setup() {
  Serial.begin(115200);
  bme.begin(0x76);
  bme.setGasHeater(320, 150); // 320°C, 150ms
}

void loop() {
  if (bme.performReading()) {
    Serial.printf("Temp: %.1fC, Qaz: %.1f kOhm\\n", bme.temperature, bme.gas_resistance / 1000.0);
  }
  delay(2000);
}`,
    },
    pros: [
      '4 sensoru tək kompakt lövhədə birləşdirir',
      'I2C interfeysi ilə cəmi 2 məlumat naqili tələb edir',
      'MQ seriyalı qaz sensorlarından qat-qat az enerji sərf edir',
    ],
    limitations: [
      'Dəqiq IAQ indeksi hesablamaq üçün Bosch BSEC kitabxanası və ilkin kalibrasiya vaxtı lazımdır',
      'Digər sadə sensorlara nisbətən qiyməti daha yüksəkdir',
    ],
    alternatives: [
      { slug: 'bmp280', name: 'BMP280', reason: 'Yalnız təzyiq və temperatur ölçmək kifayət olduqda' },
      { slug: 'mq135', name: 'MQ135', reason: 'Büdcəli analoq hava keyfiyyəti sensoru kimi' },
    ],
    isActive: true,
  },
  {
    slug: 'mq135',
    name: 'MQ-135 Hava Keyfiyyəti Sensoru',
    aliases: ['MQ135', 'MQ-135', 'MQ-135 Sensor', 'MQ135 Hava Keyfiyyəti Sensoru'],
    category: 'sensors',
    categoryLabel: 'Sensorlar',
    shortDescription:
      'Ammonyak, benzol, tüstü və CO2 kimi zərərli qazları aşkar edən analoq/rəqəmsal hava keyfiyyəti modulu.',
    definition:
      'MQ-135 SnO2 (qalay dioksid) həssas qatına əsaslanan qaz sensorudur. Təmiz havada elektrik keçiriciliyi aşağıdır; havada zərərli qazların və tüstünün konsentrasiyası artdıqca sensorun keçiriciliyi yüksəlir və A0 pinində gərginlik artır.',
    workingPrinciple:
      'Sensorun daxilindəki kiçik qızdırıcı spiral həssas elementi təxminən 200–300°C-də saxlayır. Qaz molekulları səthlə reaksiyaya girdikdə müqavimət azalır. Modul üzərindəki LM393 komparatoru həm xam analoq gərginlik (AO), həm də potensiometrlə tənzimlənən hədd rəqəmsal siqnalı (DO) verir.',
    applications: [
      'Məişət və laboratoriya hava keyfiyyəti siqnalizatorları',
      'Tüstü və zərərli qaz sızması xəbərdarlıq sistemləri',
      'ESP32/Arduino ilə ağıllı ventilyasiya idarəetməsi',
    ],
    specs: [
      { label: 'Qida gərginliyi', value: '5V DC (daxili qızdırıcı ~150–180 mA çəkir)' },
      { label: 'Aşkar etdiyi qazlar', value: 'NH3, NOx, Alkoqol, Benzol, Tüstü, CO2 (10–1000 ppm)' },
      { label: 'Çıxış siqnalları', value: 'AO (Analoq 0–5V) və DO (Rəqəmsal TTL hədd)' },
      { label: 'İsinmə müddəti', value: 'İlkin işə salmada 1–3 dəqiqə (tam sabitlik 24 saat)' },
    ],
    pinout: [
      { pin: 'VCC', name: '5V Qida', function: 'Qızdırıcı və komparator üçün 5V DC', type: 'power' },
      { pin: 'GND', name: 'Torpaq', function: 'Ümumi mənfi xətt', type: 'ground' },
      { pin: 'AO', name: 'Analoq Çıxış', function: 'Qaz konsentrasiyasına mütənasib gərginlik', type: 'analog' },
      { pin: 'DO', name: 'Rəqəmsal Çıxış', function: 'Potensiometr həddi keçildikdə LOW/HIGH siqnalı', type: 'digital' },
    ],
    wiringGuide:
      'MQ-135 qızdırıcısı 5V tələb edir. ESP32 (3.3V ADC) ilə istifadə edirsinizsə, AO çıxışını birbaşa ESP32-yə bağlamayın — 10kΩ + 20kΩ gərginlik bölücü istifadə edərək maksimum gərginliyi 3.3V-dan aşağı salın.',
    codeExample: {
      language: 'cpp',
      title: 'MQ-135 Analoq Hava Keyfiyyəti Oxuma',
      code: `const int MQ_PIN = 34; // ESP32 ADC1 (gərginlik bölücü ilə)

void setup() {
  Serial.begin(115200);
}

void loop() {
  int airQuality = analogRead(MQ_PIN);
  Serial.print("Hava göstəricisi (ADC): ");
  Serial.println(airQuality);
  delay(1000);
}`,
    },
    pros: [
      'Çox ucuzdur və tədris layihələrində geniş istifadə olunur',
      'Həm analoq dəyər, həm də hədd xəbərdarlığı (DO) verir',
    ],
    limitations: [
      'Qızdırıcı element ~160 mA cərəyan çəkdiyi üçün batareya layihələri üçün uyğun deyil',
      'Tək bir qaz növünü seçici olaraq ayırmır (ümumi qaz reaksiyası verir)',
    ],
    alternatives: [
      { slug: 'bme680', name: 'BME680', reason: 'Aşağı enerji sərfiyyatlı və I2C əsaslı dəqiq VOC ölçümü üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'soil-moisture-sensor',
    name: 'Tutumlu Torpaq Rütubəti Sensoru',
    aliases: [
      'Soil Moisture Sensor',
      'Soil Moisture Sensor v1.2',
      'Capacitive Soil Moisture Sensor',
      'Capacitive Soil Moisture Sensor v1.2',
      'Tutumlu Torpaq Rütubəti Sensoru v1.2',
      'Torpaq Rütubəti Sensoru',
    ],
    category: 'sensors',
    categoryLabel: 'Sensorlar',
    shortDescription:
      'Korroziyaya davamlı kapasitiv prinsiplə torpağın nəmlik dərəcəsini ölçən analoq sensor.',
    definition:
      'Tutumlu (kapasitiv) torpaq rütubəti sensoru v1.2 ənənəvi metal rezistiv sensorlardan fərqli olaraq torpaqda elektroliz və paslanmaya məruz qalmayan, izolyasiya olunmuş PCB kondensator lövhəsi vasitəsilə torpağın rütubətini ölçür.',
    workingPrinciple:
      'Lövhə üzərindəki 555 taymer mikrosxemi kvadrat dalğa generasiya edir və bu dalğa torpağın dielektrik sabitindən asılı olan kondensator dövrəsindən keçir. Torpaqda su artdıqca dielektrik sabiti yüksəlir və çıxış analoq gərginliyi azalır (quru torpaqda yüksək gərginlik, yaş torpaqda aşağı gərginlik).',
    applications: [
      'Avtomatik dibçək və istixana bitki suvarma sistemləri',
      'Kənd təsərrüfatı ağıllı əkin sahələri monitorinqi',
      'Ekologiya və aqrotexnika laboratoriya təcrübələri',
    ],
    specs: [
      { label: 'İş gərginliyi', value: '3.3V – 5.5V DC' },
      { label: 'Çıxış siqnalı', value: 'Analoq 0 – 3.0V' },
      { label: 'Ölçmə metodu', value: 'Kapasitiv (korroziyasız)' },
      { label: 'Cərəyan sərfiyyatı', value: '~5 mA' },
    ],
    pinout: [
      { pin: 'VCC', name: 'Qida', function: '3.3V və ya 5V müsbət xətt', type: 'power' },
      { pin: 'GND', name: 'Torpaq', function: 'Ümumi mənfi xətt', type: 'ground' },
      { pin: 'AOUT', name: 'Analoq Çıxış', function: 'Rütubətə tərs mütənasib analoq gərginlik', type: 'analog' },
    ],
    wiringGuide:
      'Sensoru torpağa yalnız ağ xəttə (Warning Line) qədər batırın; yuxarıdakı elektronika hissəsini sudan qoruyun. Havada (tam quru) və bir stəkan suda (tam yaş) ADC dəyərlərini ölçüb `map()` funksiyası ilə 0–100% aralığına kalibrləyin.',
    codeExample: {
      language: 'cpp',
      title: 'Torpaq Rütubəti Faiz Hesablama (Arduino)',
      code: `const int DRY_VAL = 590;
const int WET_VAL = 280;

void setup() {
  Serial.begin(9600);
}

void loop() {
  int raw = analogRead(A0);
  int percent = constrain(map(raw, DRY_VAL, WET_VAL, 0, 100), 0, 100);
  Serial.printf("Rütubət: %d%%\\n", percent);
  delay(1000);
}`,
    },
    pros: [
      'Açıq mis zolaqları olmadığı üçün torpaqda paslanmır',
      '3.3V və 5V mikrokontrollerlərlə birbaşa uyğundur',
    ],
    limitations: [
      'Torpağın növünə və sıxlığına görə istifadəçi tərəfindən kalibrasiya tələb edir',
      'Yuxarı elektronika hissəsi suya batırılmamalıdır',
    ],
    alternatives: [
      { slug: 'dht22', name: 'DHT22', reason: 'Torpaq əvəzinə ətraf havanın rütubətini ölçmək üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'hc-sr04',
    name: 'HC-SR04 Ultrasonik Məsafə Sensoru',
    aliases: ['HC-SR04', 'Ultrasonik Sensor', 'HC-SR04 Ultrasonik Sensor', 'HC-SR04 Ultrasonik Məsafə Sensoru'],
    category: 'sensors',
    categoryLabel: 'Sensorlar',
    shortDescription:
      '40 kHz səs dalğaları ilə 2 sm-dən 400 sm-ə qədər təmassız məsafə ölçən ultrasonik modul.',
    definition:
      'HC-SR04 exolokasiya prinsipi ilə işləyən, qarşısındakı maneəyə qədər olan məsafəni yüksək dəqiqliklə ölçən ucuz və etibarlı məsafə sensorudur.',
    workingPrinciple:
      'TRIG pininə 10 mikro-saniyəlik HIGH impulsu verildikdə sensor 8 ədəd 40 kHz ultrasonik səs dalğası göndərir. Səs dalğası maneəyə dəyib qayıtdıqda ECHO pini dalğanın gediş-gəliş müddəti qədər HIGH qalır. Məsafə `d = (müddət × 0.0343) / 2` düsturu ilə hesablanır.',
    applications: [
      'Robotlarda maneədən yayınma və naviqasiya sistemləri',
      'Su çənlərində və anbarlarda təmassız səviyyə ölçümü',
      'Ağıllı parkinq və qapı açılma sensorları',
    ],
    specs: [
      { label: 'Qida gərginliyi', value: '5V DC (15 mA iş cərəyanı)' },
      { label: 'Ölçmə diapazonu', value: '2 sm – 400 sm (~3 mm dəqiqlik)' },
      { label: 'Ölçmə bucağı', value: '~15° konus bucağı' },
      { label: 'İş tezliyi', value: '40 kHz' },
    ],
    pinout: [
      { pin: 'VCC', name: '5V Qida', function: '5V DC enerji təchizatı', type: 'power' },
      { pin: 'TRIG', name: 'Başlatma Girişi', function: '10 µs impuls qəbul edən rəqəmsal giriş', type: 'digital' },
      { pin: 'ECHO', name: 'Əks-səda Çıxışı', function: 'Müddətə mütənasib HIGH impulsu verir (5V)', type: 'data' },
      { pin: 'GND', name: 'Torpaq', function: 'Mənfi xətt', type: 'ground' },
    ],
    wiringGuide:
      'Arduino-da VCC->5V, GND->GND, TRIG və ECHO-nu istənilən rəqəmsal pinlərə qoşun. ESP32-də ECHO çıxışı 5V olduğu üçün 1kΩ + 2kΩ gərginlik bölücüsü ilə 3.3V-a endirin.',
    codeExample: {
      language: 'cpp',
      title: 'HC-SR04 Məsafə Ölçmə Nümunəsi',
      code: `const int TRIG = 9, ECHO = 10;

void setup() {
  Serial.begin(9600);
  pinMode(TRIG, OUTPUT);
  pinMode(ECHO, INPUT);
}

void loop() {
  digitalWrite(TRIG, LOW); delayMicroseconds(2);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long duration = pulseIn(ECHO, HIGH, 30000);
  float cm = duration * 0.0343 / 2.0;
  Serial.print(cm); Serial.println(" sm");
  delay(200);
}`,
    },
    pros: [
      'İşıq şəraitindən və obyektin rəngindən asılı olmadan işləyir',
      'Sadə proqramlaşdırma və aşağı qiymət',
    ],
    limitations: [
      'Yumşaq materiallar (parça, süngər) və kəskin bucaq altında olan səthlər səsi udur/yayındırır',
      'Standart versiya 5V tələb edir (3.3V üçün HC-SR04P lazımdır)',
    ],
    alternatives: [
      { slug: 'rpi-camera-v2', name: 'RPi Camera V2', reason: 'Obyektin formasını və yol nişanlarını tanımaq üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'relay-module',
    name: 'Optocütləşdiricili 5V Rele Modulu',
    aliases: [
      'Relay Module',
      'Rele Modulu',
      '4-Kanallı Optocütləşdiricili 5V Rele Modulu',
      '1-Kanallı 5V Optocütləşdiricili Rele Modulu',
      '4-Kanallı 5V Rele Modulu',
      '1-Kanallı 5V Rele Modulu',
      'Relay Modulu 4-kanal',
      '5V Rele Modulu',
    ],
    category: 'actuators',
    categoryLabel: 'Aktuatorlar və Modullar',
    shortDescription:
      'Kiçik mikrokontroller siqnalları ilə yüksək gərginlikli AC/DC yükləri (nasos, lampa, mühərrik) təhlükəsiz idarə edən açar.',
    definition:
      'Optocütləşdiricili rele modulu mikrokontrollerin 3.3V/5V aşağı cərəyanlı GPIO çıxışını 220V AC və ya yüksək cərəyanlı DC dövrələrindən qalvanik olaraq təcrid edərək elektromexaniki açar kimi idarə etməyə imkan verir.',
    workingPrinciple:
      'IN girişinə idarəetmə siqnalı verildikdə daxili optokuplor (LED + fototranzistor) işə düşür və tranzistor vasitəsilə rele sarğısına 5V verir. Maqnit sahəsi COM kontaktını NC (Normalda Bağlı) vəziyyətindən NO (Normalda Açıq) vəziyyətinə keçirir.',
    applications: [
      'Avtomatik suvarma nasoslarının qoşulub-ayrılması',
      'Ağıllı ev işıqlandırma və məişət cihazlarının idarə olunması',
      'Sənaye telemetriya düyünlərində qəza və proses açarlaması',
    ],
    specs: [
      { label: 'Sarğı gərginliyi', value: '5V DC (~70 mA hər kanal üçün)' },
      { label: 'Kontakt yük həddi', value: '10A @ 250V AC / 10A @ 30V DC' },
      { label: 'İzolyasiya', value: 'Optokuplor təcridi + flyback qoruma diodu' },
      { label: 'Aktivləşmə məntiqi', value: 'Əksər modullarda Active-LOW (LOW = Rele qoşulur)' },
    ],
    pinout: [
      { pin: 'VCC / GND', name: '5V Güc', function: 'Rele sarğıları üçün 5V DC enerji', type: 'power' },
      { pin: 'IN1..IN4', name: 'İdarəetmə Girişi', function: 'Mikrokontroller GPIO pininə qoşulur', type: 'digital' },
      { pin: 'COM / NO / NC', name: 'Yük Klemmləri', function: 'Orta (COM), Normalda Açıq (NO), Normalda Bağlı (NC)', type: 'power' },
    ],
    wiringGuide:
      'Yükün müsbət xəttini kəsib bir ucunu COM, digər ucunu NO terminalına bağlayın. Çoxkanallı relelərdə mikrokontrollerin 5V pinini yükləməmək üçün xarici 5V adapterdən JD-VCC jumperi ilə qida verin. 220V AC ilə işləyərkən təhlükəsizlik qaydalarına riayət edin!',
    codeExample: {
      language: 'cpp',
      title: 'Active-LOW Rele Modulu İdarəetməsi',
      code: `const int RELAY_PIN = 5;

void setup() {
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Başlanğıcda sönülü (Active-LOW)
}

void loop() {
  digitalWrite(RELAY_PIN, LOW);  // Releni qoş
  delay(3000);
  digitalWrite(RELAY_PIN, HIGH); // Releni söndür
  delay(3000);
}`,
    },
    pros: [
      'Mikrokontrolleri yüksək gərginlikdən optik təcridlə qoruyur',
      'Həm AC, həm də DC yükləri kommutasiya edə bilir',
    ],
    limitations: [
      'Mexaniki kontakt olduğu üçün sürətli PWM üçün uyğun deyil və klik səsi çıxarır',
      'Böyük induktiv yüklərdə kontaktların ömrü azalır',
    ],
    alternatives: [
      { slug: 'l298n', name: 'L298N Motor Sürücü', reason: 'DC mühərriklərin sürətini PWM ilə və istiqamətini dəyişmək üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'l298n',
    name: 'L298N İkiqat H-Körpülü Motor Sürücüsü',
    aliases: ['L298N', 'L298N Motor Sürücü', 'L298N Motor Sürücüsü', 'L298N İkiqat H-Körpülü DC Motor Sürücüsü'],
    category: 'actuators',
    categoryLabel: 'Aktuatorlar və Modullar',
    shortDescription:
      'İki DC mühərrikin və ya bir addım mühərrikin istiqamətini və PWM sürətini idarə edən güc sürücü modulu.',
    definition:
      'L298N iki müstəqil H-körpü (H-Bridge) sxeminə malik güclü motor sürücü mikrosxemidir. Robot platformalarında təkər mühərriklərini irəli/geri fırlatmaq və sürətlərini tənzimləmək üçün istifadə olunur.',
    workingPrinciple:
      'Hər kanalda dörd güc tranzistorundan ibarət H-körpüsü var. IN1=HIGH, IN2=LOW olduqda cərəyan bir istiqamətdə axır; IN1=LOW, IN2=HIGH olduqda əks istiqamətdə axaraq mühərriki tərsinə fırladır. ENA/ENB pinlərinə PWM siqnalı verməklə sürət tənzimlənir.',
    applications: [
      '4WD və 2WD avtonom robot şassilərinin təkər idarəetməsi',
      'Bipolar addım (stepper) mühərriklərin idarə olunması',
      'Konveyer və kiçik mexanizm sürücüləri',
    ],
    specs: [
      { label: 'Motor qida gərginliyi', value: '5V – 35V DC' },
      { label: 'Maksimum cərəyan', value: 'Hər kanalda 2A (pik)' },
      { label: 'Daxili tənzimləyici', value: '5V LDO (12V-a qədər məntiq qidası verir)' },
      { label: 'Gərginlik düşküsü', value: '~1.8V – 2.5V (BJT tranzistorlu körpü səbəbindən)' },
    ],
    pinout: [
      { pin: '12V / GND / 5V', name: 'Güc Klemmləri', function: 'Batareya (+) girişi, ümumi GND (MCU ilə birləşməlidir!) və 5V çıxış/giriş', type: 'power' },
      { pin: 'OUT1–OUT4', name: 'Motor Çıxışları', function: 'Sol və sağ DC mühərriklərə qoşulur', type: 'power' },
      { pin: 'IN1–IN4', name: 'İstiqamət Girişləri', function: 'Fırlanma istiqamətini seçən rəqəmsal siqnallar', type: 'digital' },
      { pin: 'ENA / ENB', name: 'PWM Sürət Girişləri', function: 'Jumper çıxarılıb PWM pininə qoşulduqda sürəti tənzimləyir', type: 'digital' },
    ],
    wiringGuide:
      'Batareyanın mənfi ucunu (GND) həm L298N GND klemminə, həm də Raspberry Pi/Arduino GND pininə mütləq birləşdirin! İki sağ motoru paralel OUT1/OUT2-yə, iki sol motoru isə OUT3/OUT4-ə bağlayın.',
    codeExample: {
      language: 'cpp',
      title: 'L298N İki Motor İrəli və Sürət İdarəetməsi',
      code: `const int ENA = 9, IN1 = 8, IN2 = 7;

void setup() {
  pinMode(ENA, OUTPUT); pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
}

void loop() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  analogWrite(ENA, 180); // ~70% sürət irəli
  delay(2000);
}`,
    },
    pros: [
      'Güclü radiatoru və vidalı klemmləri ilə montajı çox rahatdır',
      '7–12V batareyadan Arduino üçün hazır 5V çıxışı verə bilir',
    ],
    limitations: [
      'Köhnə BJT texnologiyası ~2V gərginlik itirir və qızır',
      'Yüksək səmərəli batareya layihələrində MOSFET sürücülərdən geri qalır',
    ],
    alternatives: [
      { slug: 'relay-module', name: '5V Rele Modulu', reason: 'Sürət tənzimləməsi olmadan sadə aç/bağla idarəetməsi üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'sg90-servo',
    name: 'SG90 Mikro Servo Motor',
    aliases: ['SG90', 'SG90 Servo', 'SG90 Mikro Servo', 'Servo Motor', 'Servo Dəsti'],
    category: 'actuators',
    categoryLabel: 'Aktuatorlar və Modullar',
    shortDescription:
      '0°–180° aralığında dəqiq bucaq mövqeyinə dönən reduktorlu mikro servo aktuator.',
    definition:
      'SG90 robot qollarında, kamera başlığının döndərilməsində və ağıllı qapı kilidlərində geniş istifadə olunan 9 qramlıq mikro servo mühərrikdir. Daxilində DC motor, dişli reduktor, potensiometr və mövqe nəzarət sxemi birləşdirilib.',
    workingPrinciple:
      'İdarəetmə xəttinə 50 Hz (hər 20 ms) tezlikdə PWM impulsu göndərilir. İmpulsun eni (1.0 ms -> 0°, 1.5 ms -> 90°, 2.0 ms -> 180°) hədəf bucağı təyin edir; daxili potensiometr valın real bucağını ölçərək xətanı sıfırlayana qədər motoru döndərir.',
    applications: [
      'Çoxoxlu robot qollar və tutucular (gripper)',
      'Ultrasonik sensorun ətrafı skan etməsi (radar mexanizmi)',
      'Ağıllı qapı, pəncərə və yemləmə mexanizmləri',
    ],
    specs: [
      { label: 'İş gərginliyi', value: '4.8V – 6.0V DC' },
      { label: 'Fırlanma momenti', value: '1.8 kg·sm (4.8V-da)' },
      { label: 'Dönmə bucağı', value: '0° – 180°' },
      { label: 'Cərəyan (yük altında)', value: '150 mA – 550 mA' },
    ],
    pinout: [
      { pin: 'Qırmızı', name: 'VCC (5V)', function: '4.8V–6V qida xətti', type: 'power' },
      { pin: 'Qəhvəyi/Qara', name: 'GND', function: 'Ümumi torpaq', type: 'ground' },
      { pin: 'Narıncı/Sarı', name: 'PWM Siqnal', function: '50 Hz mövqe idarəetmə impulsu', type: 'digital' },
    ],
    wiringGuide:
      'Bir ədəd SG90-ı test üçün 5V pininə qoşmaq olar, lakin 2 və ya daha çox servo (məsələn, 6 oxlu robot qol) istifadə edərkən mütləq xarici 5V–6V 2A+ qida bloku qoşun və GND xəttini MCU ilə birləşdirin.',
    codeExample: {
      language: 'cpp',
      title: 'SG90 Servo Bucaq İdarəetməsi (Arduino)',
      code: `#include <Servo.h>
Servo myServo;

void setup() {
  myServo.attach(9);
}

void loop() {
  myServo.write(0);
  delay(1000);
  myServo.write(90);
  delay(1000);
  myServo.write(180);
  delay(1000);
}`,
    },
    pros: [
      'Əlavə sürücü kartı olmadan birbaşa PWM pini ilə idarə olunur',
      'Yüngül, ucuz və daxili mövqe geri-əlaqəsinə malikdir',
    ],
    limitations: [
      'Plastik dişlilər yüksək zərbə yükündə qırıla bilər (ağır yük üçün MG996R lazımdır)',
      'Sıxıldıqda (stall) yüksək cərəyan çəkir',
    ],
    alternatives: [
      { slug: 'l298n', name: 'L298N + DC Motor', reason: 'Fasiləsiz 360° yüksək sürətli fırlanma üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'dc-water-pump-5v',
    name: '5V DC Mini Daldırma Su Nasosu',
    aliases: [
      '5V Su Nasosu',
      '5V DC Su Nasosu',
      '5V DC Mini Daldırma Su Nasosu və 1m Silikon Şlanq',
      'DC Water Pump 5V',
    ],
    category: 'actuators',
    categoryLabel: 'Aktuatorlar və Modullar',
    shortDescription:
      'Avtonom bitki suvarma və hidroponika sistemləri üçün aşağı gərginlikli mini mərkəzdənqaçma su nasosu.',
    definition:
      '5V DC mini daldırma su nasosu su qabının dibinə yerləşdirilən, möhürlənmiş fırçalı və ya fırçasız DC mühərriklə işləyən kompakt maye ötürücü qurğudur.',
    workingPrinciple:
      'Mühərrikə 3V–6V DC gərginlik verildikdə daxildəki pərvanə (impeller) fırlanır, mərkəzdənqaçma qüvvəsi ilə suyu yan girişdən sorub yuxarı şlanq çıxışına itələyir.',
    applications: [
      'Avtomatik dibçək və istixana bitki suvarma sistemləri',
      'Mini fəvvarələr və akvarium su dövriyyəsi',
      'Hidroponika qida məhlulu paylayıcıları',
    ],
    specs: [
      { label: 'İş gərginliyi', value: '3V – 6V DC' },
      { label: 'İş cərəyanı', value: '130 – 250 mA' },
      { label: 'Axın sürəti', value: '80 – 120 L/saat' },
      { label: 'Maksimum qaldırma hündürlüyü', value: '40 – 110 sm' },
    ],
    pinout: [
      { pin: 'Qırmızı (+)', name: 'Müsbət qida', function: 'Rele və ya MOSFET çıxışından +5V', type: 'power' },
      { pin: 'Qara/Mavi (-)', name: 'Mənfi qida', function: 'Qida blokunun GND xətti', type: 'ground' },
    ],
    wiringGuide:
      'Nasosu HEÇ VAXT birbaşa Arduino/ESP32 GPIO pininə qoşmayın — pin yanar! Nasosu 5V Rele modulu və ya NPN tranzistor + əks EMF qoruma diodu (1N4007) vasitəsilə xarici 5V qidadan sürün. Nasosu susuz (quru) işlətməyin.',
    codeExample: {
      language: 'cpp',
      title: 'Rele Vasitəsilə Su Nasosunun İdarə Olunması',
      code: `const int PUMP_RELAY = 4;

void waterPlant(int seconds) {
  digitalWrite(PUMP_RELAY, LOW);  // Nasosu işə sal
  delay(seconds * 1000);
  digitalWrite(PUMP_RELAY, HIGH); // Nasosu dayandır
}`,
    },
    pros: [
      'Aşağı 5V gərginlikdə təhlükəsiz işləmə',
      'Səssiz və kiçik ölçülü daldırma konstruksiyası',
    ],
    limitations: [
      'Quru işlədikdə tez qızır və sıradan çıxır',
      'Yüksək hündürlüyə (1 metrdən çox) su qaldıra bilmir',
    ],
    alternatives: [
      { slug: 'relay-module', name: '5V Rele Modulu', reason: 'Daha güclü 12V/220V nasosları qoşmaq üçün idarəetmə modulu' },
    ],
    isActive: true,
  },
  {
    slug: 'rpi-camera-v2',
    name: 'Raspberry Pi Camera Module V2',
    aliases: ['Raspberry Pi Camera Module V2', 'Raspberry Pi Camera V2', 'RPi Camera V2', 'IMX219 Kamera', 'Sony IMX219'],
    category: 'sensors',
    categoryLabel: 'Sensorlar',
    shortDescription:
      'Sony IMX219 8MP sensorlu, CSI interfeysi ilə Raspberry Pi-yə yüksək sürətli görüntü ötürən kamera modulu.',
    definition:
      'Raspberry Pi Camera Module V2 8 meqapiksellik Sony IMX219 CMOS sensoruna malik rəsmi kamera lövhəsidir. USB veb-kameralardan fərqli olaraq birbaşa prosessorun CSI-2 şininə qoşulur və CPU-nu yükləmədən 30–90 FPS video axını verir.',
    workingPrinciple:
      'Optik linzadan keçən işıq IMX219 piksel matrisinə düşür və 15-pinli şleyf kabel (MIPI CSI-2) vasitəsilə birbaşa Raspberry Pi GPU-suna ötürülür. `picamera2` və OpenCV kitabxanaları kadrları Python massivləri kimi emal edir.',
    applications: [
      'Xətt izləyən və yol nişanı tanıyan avtonom robotlar',
      'Üz tanıma və təhlükəsizlik müşahidə kameraları',
      'Time-lapse və laboratoriya mikroskopiya çəkilişləri',
    ],
    specs: [
      { label: 'Sensor', value: 'Sony IMX219 8 Meqapiksel (3280 × 2464)' },
      { label: 'Video rejimləri', value: '1080p30, 720p60, 640×480p90' },
      { label: 'İnterfeys', value: '15-pin MIPI CSI-2 şleyf' },
      { label: 'Fokus', value: 'Sabit fokus (1m-dən sonsuzluğa, tənzimlənə bilən halqa)' },
    ],
    pinout: [
      { pin: '15-pin CSI Ribbon', name: 'MIPI CSI-2 Şleyf', function: 'Diferensial data zolaqları, saat siqnalı, I2C idarəetmə və 3.3V qida', type: 'data' },
    ],
    wiringGuide:
      'Raspberry Pi-nin enerji təchizatını söndürün. CSI portunun qara qapağını yuxarı çəkin, şleyfin mavi tərəfi Ethernet/USB portlarına baxacaq şəkildə yerləşdirin və qapağı sıxın. Statik elektrikə qarşı diqqətli olun.',
    codeExample: {
      language: 'python',
      title: 'Picamera2 və OpenCV ilə Kadr Oxunması',
      code: `from picamera2 import Picamera2
import cv2

picam2 = Picamera2()
picam2.configure(picam2.create_preview_configuration(main={"size": (640, 480)}))
picam2.start()

frame = picam2.capture_array()
cv2.imwrite("capture.jpg", frame)`,
    },
    pros: [
      'Aşağı gecikməli CSI-2 bağlantısı USB kameradan sürətlidir',
      'OpenCV və Raspberry Pi OS ilə rəsmi dəstək',
    ],
    limitations: [
      'Yalnız CSI portu olan SBC-lərlə (Raspberry Pi) işləyir',
      'Zəif işıqda əlavə işıqlandırma və ya NoIR versiyası tələb edir',
    ],
    alternatives: [
      { slug: 'hc-sr04', name: 'HC-SR04', reason: 'Kamera əvəzinə sadə məsafə ölçümü kifayət olduqda' },
    ],
    isActive: true,
  },
  {
    slug: 'cc2530-zigbee',
    name: 'CC2530 Zigbee Simsiz Transceiver Modulu',
    aliases: ['CC2530', 'CC2530 Zigbee', 'CC2530 Zigbee Simsiz Transceiver Modulu'],
    category: 'communication',
    categoryLabel: 'Rabitə və Şəbəkə',
    shortDescription:
      '2.4 GHz IEEE 802.15.4 Zigbee mesh şəbəkələri yaratmaq üçün UART əsaslı aşağı enerjili radio modulu.',
    definition:
      'CC2530 Texas Instruments-in 8051 mikrokontrolleri ilə 2.4 GHz RF transceiver-ini birləşdirən System-on-Chip (SoC) Zigbee moduludur. Ağıllı ev şlüzlərində (Coordinator) və batareyalı sensor düyünlərində (Router/End Device) istifadə edilir.',
    workingPrinciple:
      'Z-Stack və ya Zigbee2MQTT koordinatör firmware-i yazıldıqdan sonra modul ətrafdakı Zigbee sensorları ilə şifrələnmiş mesh şəbəkə qurur və qəbul etdiyi paketləri UART (TX/RX) xətti ilə ESP32 və ya Raspberry Pi-yə ötürür.',
    applications: [
      'Yerli Home Assistant Zigbee şlüz (gateway) cihazları',
      'Ağıllı ev qapı, hərəkət və temperatur sensor şəbəkələri',
      'Aşağı enerjili sənaye mesh sensorları',
    ],
    specs: [
      { label: 'Tezlik diapazonu', value: '2.4 GHz IEEE 802.15.4 / Zigbee' },
      { label: 'İş gərginliyi', value: '2.0V – 3.6V DC (3.3V standart)' },
      { label: 'İnterfeys', value: 'UART (TX/RX), Debug (DD/DC)' },
      { label: 'Ötürmə gücü', value: '+4.5 dBm (PA versiyasında +20 dBm)' },
    ],
    pinout: [
      { pin: 'VCC / GND', name: '3.3V Qida', function: 'Stabil 3.3V enerji (5V verməyin!)', type: 'power' },
      { pin: 'P02 / P03 (RX / TX)', name: 'UART', function: 'ESP32 UART pinləri ilə çarpaz qoşulur', type: 'data' },
      { pin: 'P21 / P22 (DD / DC)', name: 'CC Debugger', function: 'Firmware yazmaq üçün proqramlaşdırma pinləri', type: 'data' },
    ],
    wiringGuide:
      'CC2530-un TX pinini ESP32-nin RX pininə, RX pinini isə TX pininə bağlayın. Modul yalnız 3.3V ilə işləyir. Koordinatör kimi işlətmək üçün əvvəlcə CC Debugger və ya ESP8266/Arduino CCLoader ilə Z-Stack firmware yazılmalıdır.',
    codeExample: {
      language: 'cpp',
      title: 'ESP32 üzərindən CC2530 UART Körpüsü',
      code: `HardwareSerial ZigbeeSerial(2);

void setup() {
  Serial.begin(115200);
  ZigbeeSerial.begin(115200, SERIAL_8N1, 16, 17); // RX=16, TX=17
}

void loop() {
  while (ZigbeeSerial.available()) {
    Serial.write(ZigbeeSerial.read());
  }
}`,
    },
    pros: [
      'Mesh topologiyası sayəsində böyük mənzillərdə əhatə dairəsini genişləndirir',
      'Wi-Fi-ya nisbətən çox az enerji sərf edir',
    ],
    limitations: [
      'Z-Stack firmware yükləmək üçün əlavə proqramator (CC Debugger) və ya CCLoader tələb edir',
    ],
    alternatives: [
      { slug: 'esp32', name: 'ESP32 (ESP-NOW / Wi-Fi)', reason: 'Zigbee olmadan birbaşa Wi-Fi/ESP-NOW şəbəkəsi qurmaq üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'rotary-encoder-ec11',
    name: 'EC11 Düyməli Dönmə Enkoderi',
    aliases: ['EC11', 'EC11 Enkoder', 'EC11 Rotary Encoder', 'Rotary Encoder EC11', 'Rotary Encoder EC11 Düyməli'],
    category: 'actuators',
    categoryLabel: 'Aktuatorlar və Modullar',
    shortDescription:
      'Sonsuz fırlanan, fırlanma istiqamətini və addımını ölçən daxili basma düyməli mexaniki enkoder.',
    definition:
      'EC11 potansiometrdən fərqli olaraq 360° məhdudiyyətsiz fırlana bilən və kvadratura (A/B faza) rəqəmsal impulslar verən idarəetmə elementidir. Osilloqraf menyuları, 3D printerlər və səs tənzimləyiciləri üçün əvəzolunmazdır.',
    workingPrinciple:
      'Daxildəki iki kontakt (CLK/A və DT/B) fırlanma zamanı 90° faza fərqi ilə açılıb-bağlanır. CLK düşən cəbhəsində DT-nin vəziyyətini oxumaqla mikrokontroller fırlanmanın saat əqrəbi və ya əks istiqamətdə olduğunu müəyyən edir.',
    applications: [
      'Osilloqraf və laboratoriya cihazlarının menyu naviqasiyası',
      'Rəqəmsal səs və işıq dimmerləri',
      'CNC və 3D printer ekran idarəetməsi',
    ],
    specs: [
      { label: 'İş gərginliyi', value: '3.3V – 5V DC' },
      { label: 'İmpuls sayı', value: 'Hər dövrdə 20 klik/impuls' },
      { label: 'Əlavə funksiya', value: 'Daxili mərkəzi basma düyməsi (SW)' },
    ],
    pinout: [
      { pin: 'CLK (A)', name: 'Faza A', function: 'Əsas impuls çıxışı (hardware interrupt tövsiyə olunur)', type: 'digital' },
      { pin: 'DT (B)', name: 'Faza B', function: 'İstiqamət təyini üçün 90° sürüşdürülmüş çıxış', type: 'digital' },
      { pin: 'SW', name: 'Düymə', function: 'Basıldıqda GND-yə bağlanır (INPUT_PULLUP)', type: 'digital' },
      { pin: 'VCC / GND', name: 'Qida', function: 'Pull-up rezistorları və torpaq', type: 'power' },
    ],
    wiringGuide:
      'CLK və DT pinlərini kəsilmə (interrupt) dəstəkləyən GPIO pinlərinə bağlayın. Mexaniki sıçrayışları (debounce) azaltmaq üçün CLK/DT ilə GND arasına 100nF kondensator əlavə etmək tövsiyə olunur.',
    codeExample: {
      language: 'cpp',
      title: 'EC11 Enkoder İstiqamət Oxunması',
      code: `int lastClk = HIGH, counter = 0;

void setup() {
  Serial.begin(9600);
  pinMode(2, INPUT_PULLUP);
  pinMode(3, INPUT_PULLUP);
}

void loop() {
  int clk = digitalRead(2);
  if (clk != lastClk && clk == LOW) {
    counter += (digitalRead(3) != clk) ? 1 : -1;
    Serial.println(counter);
  }
  lastClk = clk;
}`,
    },
    pros: [
      'Sonsuz fırlanma və dəqiq rəqəmsal addım sayma',
      'Seçim üçün daxili düymə ilə tək komponentdə tam naviqasiya',
    ],
    limitations: [
      'Mexaniki kontakt sıçrayışı (bouncing) proqram və ya RC süzgəc tələb edir',
    ],
    alternatives: [
      { slug: 'resistor', name: 'Potensiometr', reason: 'Mütləq analoq mövqe (0–270°) lazım olduqda' },
    ],
    isActive: true,
  },
  {
    slug: 'buzzer',
    name: 'Aktiv / Passiv Piezo Buzzer',
    aliases: ['Buzzer', 'Aktiv Buzzer', 'Passiv Buzzer', 'Piezo Buzzer'],
    category: 'actuators',
    categoryLabel: 'Aktuatorlar və Modullar',
    shortDescription:
      'Xəbərdarlıq siqnalları və sadə melodiyalar yaratmaq üçün kompakt səs siqnalizatoru.',
    definition:
      'Piezo buzzer elektrik enerjisini səs dalğalarına çevirən akustik komponentdir. Aktiv buzzer yalnız DC gərginliklə sabit ton çıxarır, passiv buzzer isə PWM/ton siqnalı ilə müxtəlif tezlikli melodiyalar çala bilir.',
    workingPrinciple:
      'Piezoelektrik kristal lövhəyə gərginlik tətbiq edildikdə mexaniki deformasiyaya uğrayır. Tez dəyişən gərginlik kristalın titrəməsinə və havada eşidilən səs dalğalarının yaranmasına səbəb olur.',
    applications: [
      'Təhlükəsizlik, qaz sızması və hədd aşımı xəbərdarlıq siqnalları',
      'Düymə basma təsdiq səsi və taymerlər',
      'Təhsil layihələrində sadə musiqi generatorları',
    ],
    specs: [
      { label: 'İş gərginliyi', value: '3.3V – 5V DC' },
      { label: 'Səs səviyyəsi', value: '~85 dB @ 10 sm' },
      { label: 'Rezonans tezliyi', value: '2.0 – 2.7 kHz' },
      { label: 'Cərəyan sərfiyyatı', value: '< 30 mA' },
    ],
    pinout: [
      { pin: '+ (S)', name: 'Siqnal / Müsbət', function: 'Mikrokontroller GPIO/PWM pininə', type: 'digital' },
      { pin: '-', name: 'GND', function: 'Ümumi torpaq', type: 'ground' },
    ],
    wiringGuide:
      'Müsbət (+) ayağı rəqəmsal pinə, mənfi (-) ayağı GND-yə qoşun. Aktiv buzzer üçün `digitalWrite(HIGH)`, passiv buzzer üçün isə `tone(pin, tezlik)` funksiyası istifadə olunur.',
    codeExample: {
      language: 'cpp',
      title: 'Buzzer Xəbərdarlıq Siqnalı (Arduino)',
      code: `const int BUZZER_PIN = 8;

void setup() {
  pinMode(BUZZER_PIN, OUTPUT);
}

void loop() {
  tone(BUZZER_PIN, 2000, 200); // 2kHz 200ms siqnal
  delay(1000);
}`,
    },
    pros: [
      'Çox az enerji çəkir və birbaşa GPIO-dan sürülə bilir',
      'Kompakt və ucuz səsli geri-əlaqə vasitəsi',
    ],
    limitations: [
      'Yalnız yüksək tezlikli "bip" səsləri və sadə melodiyalar üçündür (nitq/musiqi üçün dinamik lazımdır)',
    ],
    alternatives: [
      { slug: 'led', name: '5mm LED', reason: 'Səsli deyil, vizual xəbərdarlıq lazım olduqda' },
    ],
    isActive: true,
  },
  {
    slug: 'lcd-16x2-i2c',
    name: '16x2 I2C LCD Ekran Modulu',
    aliases: [
      '16x2 LCD',
      '16x2 I2C LCD',
      '16x2 LCD (I2C)',
      'LCD 1602 I2C',
      'LCD 16x2 (PCF8574)',
      '16x2 LCD Ekran I2C Modulu ilə',
      'LCD1602',
    ],
    category: 'displays',
    categoryLabel: 'Ekranlar və İndikasiya',
    shortDescription:
      'PCF8574 I2C adapteri sayəsində cəmi 2 data naqili ilə 2 sətir × 16 simvol göstərən klassik LCD displey.',
    definition:
      '1602 I2C LCD ekranı HD44780 kontrollerli mətn displeyinin arxasına PCF8574 I2C genişləndirici çipi lehimlənmiş formasıdır. Normalda 6–10 pin tələb edən ekranı cəmi SDA və SCL xətləri ilə idarə etməyə imkan verir.',
    workingPrinciple:
      'Mikrokontroller I2C üzərindən (adətən 0x27 və ya 0x3F ünvanına) simvolların ASCII kodlarını göndərir. PCF8574 bu ardıcıl məlumatı 4-bitlik paralel siqnallara çevirərək LCD kristal matrisini idarə edir.',
    applications: [
      'Hava stansiyalarında temperatur, rütubət və təzyiq göstəricisi',
      'Ağıllı sayğaclar, menyu interfeysləri və laboratoriya cihazları',
    ],
    specs: [
      { label: 'Göstərici formatı', value: '16 simvol × 2 sətir' },
      { label: 'Qida gərginliyi', value: '5V DC' },
      { label: 'İnterfeys', value: 'I2C (standart ünvan 0x27 və ya 0x3F)' },
      { label: 'Arxa işıq', value: 'Mavi və ya yaşıl-sarı LED (proqramla idarə olunan)' },
    ],
    pinout: [
      { pin: 'VCC', name: '5V Qida', function: '5V DC (kontrast və arxa işıq üçün)', type: 'power' },
      { pin: 'GND', name: 'Torpaq', function: 'Ümumi torpaq', type: 'ground' },
      { pin: 'SDA / SCL', name: 'I2C Şini', function: 'Arduino A4/A5 və ya ESP32 GPIO21/22', type: 'data' },
    ],
    wiringGuide:
      'VCC-ni 5V-a, GND-ni torpağa, SDA və SCL-i mikrokontrollerin I2C pinlərinə qoşun. Yazılar görünmürsə, modulun arxasındakı mavi potensiometri kiçik tornavida ilə fırladıb kontrastı tənzimləyin.',
    codeExample: {
      language: 'cpp',
      title: '16x2 I2C LCD Ekrana Mətn Yazılması',
      code: `#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("FeedLab Sensor");
  lcd.setCursor(0, 1);
  lcd.print("Temp: 24.5 C");
}

void loop() {}`,
    },
    pros: [
      'Cəmi 4 naqillə qoşulur, pin qənaəti edir',
      'Gün işığında oxunması asan və çox davamlıdır',
    ],
    limitations: [
      'Qrafika və ya uzun mətn göstərmək məhduddur (yalnız 32 simvol)',
      '5V məntiqlidir (ESP32 ilə işləyərkən 5V qida + I2C səviyyə çeviricisi tövsiyə olunur)',
    ],
    alternatives: [
      { slug: 'oled-ssd1306', name: 'OLED SSD1306', reason: '3.3V uyğunluğu və qrafik/ikon çəkmək üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'oled-ssd1306',
    name: '0.96" I2C OLED Ekran (SSD1306)',
    aliases: [
      'SSD1306',
      'OLED SSD1306',
      'OLED (SSD1306)',
      '0.96" I2C OLED (SSD1306)',
      '0.96 düym OLED (SSD1306)',
      '0.96 düym I2C OLED Ekran',
      'OLED 0.96 inch I2C',
    ],
    category: 'displays',
    categoryLabel: 'Ekranlar və İndikasiya',
    shortDescription:
      '128×64 piksel ayırdetməli, yüksək kontrastlı, arxa işığa ehtiyacı olmayan I2C qrafik OLED ekran.',
    definition:
      'SSD1306 əsaslı 0.96 düymlük OLED ekran hər pikselin öz-özünə işıqlandığı üzvi işıq diodlu (OLED) qrafik displeydir. Kiçik ölçüsü, kəskin kontrastı və 3.3V/5V uyğunluğu sayəsində IoT layihələrinin əsas ekranıdır.',
    workingPrinciple:
      'Mikrokontroller I2C (0x3C ünvanı) vasitəsilə 128×64 pikselə uyğun 1 KB-lıq kadr buferini (GDDRAM) SSD1306 sürücüsünə göndərir. Aktiv piksellər birbaşa işıqlanır, qara piksellər isə tam sönülü qalır.',
    applications: [
      'Ağıllı ev şlüzlərində status və IP ünvanı göstəricisi',
      'Portativ cihazlarda qrafik, ikon və batareya səviyyəsi paneli',
      'Mini sensor monitorları',
    ],
    specs: [
      { label: 'Ayırdetmə', value: '128 × 64 piksel (monoxrom ağ / mavi / sarı-mavi)' },
      { label: 'Qida gərginliyi', value: '3.3V – 5V DC' },
      { label: 'İnterfeys', value: 'I2C (ünvan 0x3C və ya 0x3D)' },
      { label: 'Enerji sərfiyyatı', value: '~10–20 mA (aktiv piksellərin sayından asılıdır)' },
    ],
    pinout: [
      { pin: 'VCC', name: 'Qida', function: '3.3V və ya 5V (lövhə üzərində LDO var)', type: 'power' },
      { pin: 'GND', name: 'Torpaq', function: 'Ümumi mənfi xətt', type: 'ground' },
      { pin: 'SCL / SDA', name: 'I2C Şini', function: 'Saat və məlumat xətləri', type: 'data' },
    ],
    wiringGuide:
      'ESP32-də VCC->3V3, GND->GND, SDA->GPIO21, SCL->GPIO22 qoşun. Bəzi modullarda VCC və GND yerləri fərqli ola bilər — qoşmazdan əvvəl PCB üzərindəki yazıları yoxlayın!',
    codeExample: {
      language: 'cpp',
      title: 'SSD1306 OLED Ekrana Yazı və Qrafik Çəkmə',
      code: `#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup() {
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 10);
  display.println("FeedLab IoT Hazirdir!");
  display.display();
}`,
    },
    pros: [
      'Yüksək kontrast və geniş baxış bucağı',
      'Qrafik, xətt, şrift və ikonları çəkə bilir',
      '3.3V və 5V sistemlərlə problemsiz işləyir',
    ],
    limitations: [
      '0.96 düym ekran uzaqdan oxumaq üçün kiçikdir',
      'Arduino Uno-nun 2 KB SRAM-nın yarısını (1 KB) ekran buferi tutur',
    ],
    alternatives: [
      { slug: 'lcd-16x2-i2c', name: '16x2 I2C LCD', reason: 'Böyük şriftli sadə mətn üçün' },
      { slug: 'tft-ili9341', name: 'TFT ILI9341', reason: 'Rəngli, böyük və sensorlu qrafik interfeys üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'tft-ili9341',
    name: '2.8" SPI TFT Rəngli Ekran (ILI9341)',
    aliases: [
      'ILI9341',
      'TFT ILI9341',
      '2.8" SPI TFT (ILI9341)',
      '2.8 düym TFT (ILI9341)',
      '2.8 düym TFT SPI 240x320 Ekran ILI9341',
      'TFT SPI Ekran',
    ],
    category: 'displays',
    categoryLabel: 'Ekranlar və İndikasiya',
    shortDescription:
      '240×320 piksel rəngli, yüksək sürətli SPI interfeysli və rezistiv sensor panelli TFT ekran.',
    definition:
      'ILI9341 sürücülü 2.8 düym TFT ekran 16-bit (65K) rəng dərinliyinə malik, qrafiklər, osilloqraf dalğaları və toxunma menyuları yaratmaq üçün nəzərdə tutulmuş rəngli qrafik displeydir.',
    workingPrinciple:
      'SPI (MOSI, SCK, CS, DC) yüksək tezlikli məlumat şini ilə mikrokontroller piksellərin RGB565 rəng kodlarını ekranın daxili RAM-na göndərir. XPT2046 çipi isə ekran üzərindəki toxunma koordinatlarını ayrıca SPI kanalı ilə oxuyur.',
    applications: [
      'Rəqəmsal osilloqraf və spektr analizatorları',
      'Sensorlu ağıllı ev divar panelləri (HMI)',
      'Portativ oyun və qrafik ölçü cihazları',
    ],
    specs: [
      { label: 'Ayırdetmə', value: '240 × 320 piksel, 65K rəng' },
      { label: 'İnterfeys', value: 'SPI (3.3V məntiq)' },
      { label: 'Sensor panel', value: 'XPT2046 rezistiv toxunma kontrolleri' },
      { label: 'Qida', value: '3.3V – 5V (VCC LDO tənzimləyici ilə)' },
    ],
    pinout: [
      { pin: 'VCC / GND / LED', name: 'Qida və Arxa İşıq', function: 'Enerji və 3.3V arxa işıq qidası', type: 'power' },
      { pin: 'SCK / MOSI / MISO', name: 'SPI Şini', function: 'Yüksək sürətli qrafik ötürmə xətləri', type: 'data' },
      { pin: 'CS / DC / RESET', name: 'İdarəetmə', function: 'Çip seçimi, Data/Komanda seçimi və sıfırlama', type: 'digital' },
    ],
    wiringGuide:
      'STM32 və ESP32 kimi 3.3V mikrokontrollerlərlə birbaşa SPI pinlərinə qoşulur. 5V Arduino Uno istifadə edilərsə bütün data pinlərinə məntiq səviyyə çeviricisi qoşulmalıdır.',
    codeExample: {
      language: 'cpp',
      title: 'ILI9341 TFT Ekranda Osilloqraf Şəbəkəsi Çəkmə',
      code: `#include <Adafruit_ILI9341.h>
Adafruit_ILI9341 tft = Adafruit_ILI9341(10, 9, 8); // CS, DC, RST

void setup() {
  tft.begin();
  tft.setRotation(1);
  tft.fillScreen(ILI9341_BLACK);
  tft.drawLine(0, 120, 320, 120, ILI9341_DARKGREEN);
}`,
    },
    pros: [
      'Rəngli, böyük və toxunma dəstəkli peşəkar interfeys',
      'SPI interfeysi STM32/ESP32-də yüksək FPS verir',
    ],
    limitations: [
      '3.3V məntiq tələb edir və tam ekranı yeniləmək üçün sürətli SPI/DMA lazımdır',
    ],
    alternatives: [
      { slug: 'oled-ssd1306', name: 'OLED SSD1306', reason: 'Kiçik monoxrom ekran və cəmi 2 data pini kifayət olduqda' },
    ],
    isActive: true,
  },
  {
    slug: 'resistor',
    name: 'Rezistor (Müqavimət Elementi)',
    aliases: [
      'Rezistor',
      'Resistor',
      'Resistors',
      'Rezistor (Müqavimət)',
      '220 Ohm Rezistor',
      '1k Ohm Rezistor',
      '4.7k Ohm Rezistor',
      '10k Ohm Rezistor',
    ],
    category: 'passive',
    categoryLabel: 'Passiv və Prototipləmə',
    shortDescription:
      'Elektrik dövrəsində cərəyanı məhdudlaşdıran, gərginliyi bölən və məntiq xətlərini sabitləyən əsas passiv komponent.',
    definition:
      'Rezistor Om qanununa (`V = I × R`) uyğun olaraq elektrik cərəyanının axınına müəyyən edilmiş müqavimət göstərən ikiayaqlı passiv elektronika komponentidir. LED-ləri yanmaqdan qorumaq, pull-up/pull-down yaratmaq və gərginlik bölücüləri qurmaq üçün istifadə edilir.',
    workingPrinciple:
      'Karbon və ya metal təbəqəli rezistiv material elektronların hərəkətini çətinləşdirir və artıq enerjini istiliyə çevirir. Rəng zolaqları (məsələn, 220Ω üçün qırmızı-qırmızı-qəhvəyi) müqavimət qiymətini və dəqiqlik sinfini göstərir.',
    applications: [
      'LED-lər üçün cərəyan məhdudlaşdırıcısı (220Ω – 330Ω)',
      'Düymələr, I2C və 1-Wire xətləri üçün pull-up/pull-down (4.7kΩ – 10kΩ)',
      '5V sensor siqnallarını 3.3V MCU üçün endirən gərginlik bölücüləri (1kΩ + 2kΩ)',
    ],
    specs: [
      { label: 'Güc həddi (standart)', value: '0.25W (1/4 Watt) THT' },
      { label: 'Dəqiqlik (Tolerance)', value: '±5% (Karbon film) / ±1% (Metal film)' },
      { label: 'Populyar qiymətlər', value: '220Ω, 330Ω, 1kΩ, 2kΩ, 4.7kΩ, 10kΩ' },
    ],
    pinout: [
      { pin: '1', name: 'Ayaq 1', function: 'Qütbsüzdür — istənilən istiqamətdə qoşula bilər', type: 'passive' },
      { pin: '2', name: 'Ayaq 2', function: 'Qütbsüzdür — istənilən istiqamətdə qoşula bilər', type: 'passive' },
    ],
    wiringGuide:
      'Rezistorların qütbü yoxdur. 5V-da standart qırmızı LED üçün ardıcıl 220Ω rezistor bağlayın (`I = (5V - 2V) / 220Ω ≈ 13.6 mA`). Çox yüksək cərəyanlı yüklərdə `P = I² × R` düsturu ilə 0.25W həddinin aşılmadığını yoxlayın.',
    codeExample: null,
    pros: [
      'Ucuz, etibarlı və istənilən elektronika sxeminin təməl daşı',
      'Qütbsüz olduğu üçün tərs qoşulma riski yoxdur',
    ],
    limitations: [
      'Standart 0.25W rezistorlar yüksək güc dövrələrində qızır və yanır',
      'Sabit qiymətlidir (dəyişən müqavimət üçün potensiometr lazımdır)',
    ],
    alternatives: [
      { slug: 'rotary-encoder-ec11', name: 'Potensiometr / Enkoder', reason: 'İstifadəçi tərəfindən dəyişdirilə bilən idarəetmə üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'led',
    name: '5mm İşıq Saçan Diod (LED)',
    aliases: ['LED', '5mm LED', 'LED (5mm)', '5mm Qırmızı LED', 'Qırmızı LED'],
    category: 'passive',
    categoryLabel: 'Passiv və Prototipləmə',
    shortDescription:
      'Elektrik cərəyanı keçdikdə işıq saçan, qütblü yarımkeçirici indikasiya elementi.',
    definition:
      'LED (Light Emitting Diode) düz istiqamətdə cərəyan keçdikdə fotonlar buraxaraq işıqlanan yarımkeçirici dioddur. Qida statusu, xəbərdarlıq və məntiq vəziyyətinin vizual indikasiyası üçün istifadə olunur.',
    workingPrinciple:
      'Anod (+) müsbətə, Katod (-) mənfiyə bağlandıqda və düz düşmə gərginliyi (qırmızı LED-də ~1.8–2.1V, mavi/ağda ~3.0–3.3V) keçildikdə elektronlar və deşiklər birləşərək işıq enerjisi buraxır.',
    applications: [
      'Dövrədə güc və siqnal statusu göstəricisi',
      'Arduino başlanğıc fləşer və trafik işığı təcrübələri',
      'PWM ilə parlaqlıq tənzimləmə layihələri',
    ],
    specs: [
      { label: 'Düz gərginlik (Vf)', value: '1.8V–2.2V (Qırmızı/Sarı/Yaşıl), 3.0V–3.3V (Mavi/Ağ)' },
      { label: 'Nominal iş cərəyanı', value: '10 mA – 20 mA' },
      { label: 'Korpus', value: '5 mm THT DIP' },
    ],
    pinout: [
      { pin: 'Uzun ayaq (+)', name: 'Anod', function: 'Müsbət siqnala (220Ω rezistor vasitəsilə) qoşulur', type: 'power' },
      { pin: 'Qısa ayaq / Düz kənar (-)', name: 'Katod', function: 'GND (torpaq) xəttinə qoşulur', type: 'ground' },
    ],
    wiringGuide:
      'LED-i HEÇ VAXT rezistorsuz birbaşa 5V mənbəyə bağlamayın — dərhal yanar! Uzun ayağı (Anod) 220Ω–330Ω rezistor vasitəsilə GPIO pininə, qısa ayağı (Katod) isə GND-yə bağlayın.',
    codeExample: null,
    pros: [
      'Aşağı enerji sərfiyyatı və çox uzun ömür (>50,000 saat)',
      'Ani açılıb-sönmə (mikrosaniyələr ərzində PWM dəstəyi)',
    ],
    limitations: [
      'Qütblüdür (tərs bağlandıqda işıqlanmır) və mütləq cərəyan məhdudlaşdırıcı rezistor tələb edir',
    ],
    alternatives: [
      { slug: 'oled-ssd1306', name: 'OLED SSD1306', reason: 'Tək rəngli işıq əvəzinə rəqəm və mətn göstərmək üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'breadboard-jumper',
    name: 'MB-102 Breadboard və Jumper Tellər',
    aliases: ['Breadboard', 'MB-102 Breadboard', 'MB-102 Breadboard və Jumper Tellər', 'Jumper Tellər'],
    category: 'passive',
    categoryLabel: 'Passiv və Prototipləmə',
    shortDescription:
      'Lehimləmə etmədən elektron sxemləri sürətlə qurmaq və sınaqdan keçirmək üçün 830 nöqtəli maket lövhəsi.',
    definition:
      'MB-102 breadboard (maket lövhəsi) daxilində yaylı mis kontakt zolaqları olan, komponentləri və jumper telləri sadəcə taxmaqla elektrik bağlantısı quran prototipləmə alətidir.',
    workingPrinciple:
      'Lövhənin yuxarı və aşağı kənarlarındakı qırmızı (+) və mavi (-) xətlər üfüqi (uzununa) olaraq birləşdirilib (qida şinləri). Ortadakı A–E və F–J sütunları isə hər 5 deşik şaquli olaraq öz aralarında bağlıdır və mərkəzi boşluqla ayrılır.',
    applications: [
      'Laboratoriya dərslərində sxemlərin sürətli yığılması',
      'PCB sifariş etməzdən əvvəl sensor və MCU testləri',
    ],
    specs: [
      { label: 'Kontakt sayı', value: '830 nöqtə (630 əsas + 200 qida şini)' },
      { label: 'Tel uyğunluğu', value: '20–29 AWG (standart 0.1" / 2.54 mm addım)' },
      { label: 'Maksimum cərəyan', value: '~1A – 1.5A (yüksək güc yükləri üçün uyğun deyil)' },
    ],
    pinout: [
      { pin: 'Qırmızı / Mavi Şinlər', name: 'Güc Xətləri', function: 'Üfüqi qida (+VCC) və torpaq (-GND) paylanması', type: 'power' },
      { pin: 'A–E / F–J', name: 'Komponent Yuvaları', function: '5-deşikli şaquli bağlantı qrupları', type: 'passive' },
    ],
    wiringGuide:
      'Mikrosxemləri və Arduino Nano/ESP32 lövhələrini mərkəzi xəttin iki tərəfinə yerləşdirin. Bəzi 830 nöqtəli breadboard-larda üfüqi qida şinləri ortada kəsilmiş olur ("W" hərfi işarəsində) — multimeterlə və ya əlavə jumper ilə davamlılığı yoxlayın.',
    codeExample: null,
    pros: [
      'Lehimləməsiz təkrar istifadə olunan sürətli prototipləmə',
      'Səhv bağlantını saniyələr ərzində düzəltmək mümkündür',
    ],
    limitations: [
      'Yüksək cərəyan (>1A) və yüksək tezlikli RF/SPI siqnallarında əlaqə keyfiyyəti düşə bilər',
    ],
    alternatives: [
      { slug: 'resistor', name: 'Perfboard / PCB', reason: 'Qalıcı və titrəməyə davamlı lehimlənmiş dövrələr üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'power-supply-5v',
    name: '5V 2A Sabit Qida Bloku',
    aliases: [
      '5V Qida Bloku',
      '5V 2A Qida Bloku',
      'Mean Well 5V 2A Din-Rail Qida Bloku',
      '5V 2A Şəbəkə Qida Adaptoru',
    ],
    category: 'power',
    categoryLabel: 'Qida və Energetika',
    shortDescription:
      '220V AC şəbəkə gərginliyini mikrokontroller, rele və nasoslar üçün stabil 5V DC-yə çevirən enerji mənbəyi.',
    definition:
      '5V 2A qida bloku impuls (SMPS) çevirmə texnologiyası ilə 100–240V AC elektrik şəbəkəsindən qalvanik olaraq təcrid edilmiş, qısaqapanma və artıq yüklənmədən qorunan stabil 5V sabit gərginlik verir.',
    workingPrinciple:
      'Giriş AC gərginliyi düzləndirilir, yüksək tezlikli transformatordan keçirilir və optokuplor geri-əlaqəsi ilə çıxış gərginliyi yük dəyişsə belə 5.0V ±2% səviyyəsində saxlanılır.',
    applications: [
      '24/7 işləyən ESP32 sənaye telemetriya şkafları (DIN-Rail)',
      'Suvarma nasosu, servo və çoxkanallı rele modullarının qidalanması',
    ],
    specs: [
      { label: 'Giriş gərginliyi', value: '100 – 240V AC, 50/60 Hz' },
      { label: 'Çıxış', value: '5V DC, 2A (10W)' },
      { label: 'Qoruma', value: 'Qısaqapanma (SCP), Artıq yük (OLP), Artıq gərginlik (OVP)' },
    ],
    pinout: [
      { pin: 'L / N (AC)', name: 'Şəbəkə Girişi', function: '220V AC faza və neytral', type: 'power' },
      { pin: '+V / -V (DC)', name: '5V Çıxış', function: 'Stabil +5V və GND çıxışı', type: 'power' },
    ],
    wiringGuide:
      'Xarici 5V qida blokunu Arduino/ESP32 ilə birlikdə istifadə edərkən bütün modulların GND xətlərini birləşdirin. 220V AC klemmlərini izolyasiyalı qutu daxilində saxlayın.',
    codeExample: null,
    pros: [
      'Kompüter USB portunun 500 mA limitindən 4 dəfə güclüdür',
      'Qısaqapanmaya və sənaye şəbəkə dalğalanmalarına qarşı qorunur',
    ],
    limitations: [
      'Şəbəkə (220V) olmayan səyyar/avtonom robotlarda işləmir',
    ],
    alternatives: [
      { slug: 'battery-18650-bms', name: '18650 Li-ion + BMS', reason: 'Şəbəkədən asılı olmayan mobil və robot layihələri üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'battery-18650-bms',
    name: '2x 18650 Li-ion Batareya və BMS Modulu',
    aliases: [
      '18650 BMS',
      '2S 18650 BMS',
      '2x 18650 Li-ion Batareya və BMS Qoruma Lövhəsi',
      '18650 Li-ion Batareya',
    ],
    category: 'power',
    categoryLabel: 'Qida və Energetika',
    shortDescription:
      'Robotlar və portativ cihazlar üçün 7.4V (2S) yüksək tutumlu litium-ion batareya paketi və qoruma lövhəsi.',
    definition:
      '18650 Li-ion elementləri yüksək enerji sıxlığına malik təkrar doldurulan batareyalardır. BMS (Battery Management System) lövhəsi isə batareyanı həddindən artıq dolmadan (>4.2V/hüceyrə), dərin boşalmadan (<2.5V/hüceyrə) və qısaqapanmadan qoruyur.',
    workingPrinciple:
      'İki element ardıcıl (2S) qoşulduqda nominal 7.4V (tam dolu 8.4V) gərginlik alınır. BMS üzərindəki DW01/S-8254A nəzarətçisi və MOSFET açarları hər hüceyrənin gərginliyini izləyir və təhlükəli həddə çatdıqda dövrəni avtomatik ayırır.',
    applications: [
      '4WD avtonom robotların və L298N motor sürücülərinin qidası',
      'Günəş panelli uzaq IoT sensor stansiyaları',
      'Portativ laboratoriya ölçü cihazları',
    ],
    specs: [
      { label: 'Nominal gərginlik', value: '7.4V DC (2S ardıcıl, tam dolu 8.4V)' },
      { label: 'Tutum', value: '2000 – 3400 mAh' },
      { label: 'BMS qoruma funksiyaları', value: 'Overcharge (4.25V), Overdischarge (2.5V), Qısaqapanma' },
    ],
    pinout: [
      { pin: 'B+ / BM / B-', name: 'Hüceyrə Bağlantıları', function: '2S batareya ucları və orta balans nöqtəsi', type: 'power' },
      { pin: 'P+ / P-', name: 'Yük və Şarj Çıxışı', function: 'Qorunan 7.4V çıxış (motor sürücü və 5V buck çeviriciyə)', type: 'power' },
    ],
    wiringGuide:
      '7.4V batareyanı birbaşa Raspberry Pi və ya ESP32-yə qoşmayın! L298N motor sürücüsünə birbaşa verə bilərsiniz, lakin Raspberry Pi/ESP32 üçün araya mütləq 5V 3A Step-Down (Buck) çevirici qoşun. Yalnız 2S Li-ion (8.4V) şarj cihazı ilə doldurun.',
    codeExample: null,
    pros: [
      'Yüksək enerji tutumu və ağır motor cərəyanlarını ödəmə qabiliyyəti',
      'BMS sayəsində yanğın və batareya sıradan çıxma riski minimuma enir',
    ],
    limitations: [
      '5V məntiqli cihazlar üçün əlavə Buck (Step-Down) gərginlik çevirici tələb edir',
    ],
    alternatives: [
      { slug: 'power-supply-5v', name: '5V 2A Qida Bloku', reason: 'Stasionar masaüstü və ya sənaye sistemləri üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'tl072-opamp',
    name: 'TL072 Aşağı Səs-küylü İkiqat Op-Amp',
    aliases: ['TL072', 'TL072CP', 'TL072 Op-Amp', 'TL072 (Op-Amp)', 'TL072CP Aşağı Səs-küylü İkiqat Op-Amp'],
    category: 'passive',
    categoryLabel: 'Passiv və Prototipləmə',
    shortDescription:
      'JFET girişli, yüksək sürətli və aşağı səs-küylü ikiqat əməliyyat gücləndiricisi (analog front-end).',
    definition:
      'TL072CP bir 8-pinli DIP korpusda iki müstəqil JFET-girişli əməliyyat gücləndiricisini (Operational Amplifier) birləşdirən analoq mikrosxemdir. Osilloqraf giriş zəiflədicilərində, audio preamplifikatorlarda və sensor siqnal kondisionerlərində istifadə olunur.',
    workingPrinciple:
      'Yüksək giriş müqaviməti (JFET) sayəsində ölçülən dövrədən demək olar ki, heç cərəyan çəkmir. Xarici əks-əlaqə rezistorları ilə gərginliyi bölmək, gücləndirmək və ya müsbət/mənfi siqnalları ADC-nin 0–3.3V aralığına sürüşdürmək (DC offset) üçün tənzimlənir.',
    applications: [
      'Rəqəmsal osilloqraf analoq giriş buferi və gərginlik sürüşdürücüsü',
      'Elektrokardioqram (ECG) və zəif sensor siqnallarının gücləndirilməsi',
      'Aktiv analoq filtrlər və audio sxemlər',
    ],
    specs: [
      { label: 'Kanal sayı', value: '2 ədəd müstəqil Op-Amp (DIP-8)' },
      { label: 'Bant genişliyi', value: '3 MHz (Gain-Bandwidth Product)' },
      { label: 'Slew Rate', value: '13 V/µs' },
      { label: 'Qida diapazonu', value: '±3.5V ... ±18V (və ya 7V–36V tək qida)' },
    ],
    pinout: [
      { pin: '1 / 7', name: 'OUT1 / OUT2', function: 'Gücləndirilmiş çıxışlar', type: 'analog' },
      { pin: '2, 3 / 6, 5', name: 'IN- / IN+', function: 'İnverting və Non-inverting girişlər', type: 'analog' },
      { pin: '4 / 8', name: 'VCC- / VCC+', function: 'Mənfi və müsbət qida ayaqları', type: 'power' },
    ],
    wiringGuide:
      'Güc pinlərinin (Pin 4 və Pin 8) yanına 100nF keramik dekuplinq kondensatorları qoyun. Rail-to-rail olmadığı üçün çıxış gərginliyi qida sərhədlərinə ~1.5V qədər yaxınlaşa bilər.',
    codeExample: null,
    pros: [
      'Çox yüksək giriş müqaviməti və aşağı səs-küy',
      'Yüksək sürət (13 V/µs) osilloqraf və audio üçün idealdır',
    ],
    limitations: [
      'Tək 3.3V/5V qidada işləmir (minimum ~7V və ya simmetrik ±5V qida lazımdır)',
    ],
    alternatives: [
      { slug: 'resistor', name: 'Rezistor Gərginlik Bölücü', reason: 'Aktiv gücləndirmə olmadan sadə DC gərginlik azaltması üçün' },
    ],
    isActive: true,
  },
  {
    slug: 'robot-chassis-4wd',
    name: '4WD Alüminium Robot Şassi Dəsti',
    aliases: ['4WD Şassi', '4WD Robot Şassi', '4WD Alüminium Robot Şassi Dəsti', 'Robot Şassi'],
    category: 'passive',
    categoryLabel: 'Passiv və Prototipləmə',
    shortDescription:
      '4 ədəd reduktorlu TT DC motor, təkər və alüminium/akril gövdədən ibarət mobil robot platforması.',
    definition:
      '4WD Robot Şassi Dəsti Raspberry Pi, Arduino və ya ESP32 əsaslı mobil robotları sıfırdan yığmaq üçün lazım olan mexaniki çərçivə, 4 ədəd 1:48 reduktorlu DC motor və yüksək tutuşlu rezin təkərləri əhatə edir.',
    workingPrinciple:
      'Hər iki tərəfdəki cüt motorlar L298N H-körpüsünün iki kanalına bağlanır. Sağ və sol təkərlərə fərqli sürət və ya əks istiqamət verməklə (diferensial sükan) robot öz oxu ətrafında dönə və ya irəli/geri hərəkət edə bilir.',
    applications: [
      'Görüntü emalı edən və xətt izləyən avtonom robotlar',
      'Wi-Fi/Bluetooth uzaqdan idarə olunan kəşfiyyat maşınları',
      'Ultrasonik maneədən qaçan təhsil robotları',
    ],
    specs: [
      { label: 'Motor tipi', value: '4× DC TT Reduktorlu Motor (1:48 nisbəti)' },
      { label: 'Motor iş gərginliyi', value: '3V – 6V DC (L298N ilə 7.4V batareyadan sürülür)' },
      { label: 'Yük daşıma qabiliyyəti', value: '~1.5 – 2.0 kq (Raspberry Pi + batareya + kamera üçün kifayətdir)' },
    ],
    pinout: [
      { pin: 'Sol Motorlar (+/-)', name: 'Sol Kanal', function: 'L298N OUT1/OUT2 çıxışlarına paralel qoşulur', type: 'power' },
      { pin: 'Sağ Motorlar (+/-)', name: 'Sağ Kanal', function: 'L298N OUT3/OUT4 çıxışlarına paralel qoşulur', type: 'power' },
    ],
    wiringGuide:
      'Motorlara naqilləri lehimləyin və qırılmaması üçün silikon yapışqan və ya kəmərlə bərkidin. Motorlardan gələn elektrik səs-küyünü azaltmaq üçün motor terminallarına 100nF keramik kondensator lehimləmək tövsiyə olunur.',
    codeExample: null,
    pros: [
      'Dörd çəkən təkər sayəsində yüksək dartma gücü və sabitlik',
      'Raspberry Pi, L298N və batareya üçün geniş montaj sahəsi',
    ],
    limitations: [
      'Diferensial dönmə zamanı təkərlər yerə sürtünür (odometriya dəqiqliyi enkoderlə yaxşılaşdırılır)',
    ],
    alternatives: [
      { slug: 'l298n', name: 'L298N Motor Sürücüsü', reason: 'Bu şassi motorlarını idarə etmək üçün tələb olunan sürücü modulu' },
    ],
    isActive: true,
  },
];
