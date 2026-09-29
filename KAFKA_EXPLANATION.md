# NestJS + Kafka Implementation Guide (Tanglish)

Intha guide la namma NestJS project la Kafka eppadi integrate pannom, enna files add pannom, and ovvoru code block um enna work pannuthu nu detail-a paakalam.

---

## 1. Packages Installation
**Enna pannom?**
Kafka features-a NestJS la use panna `npm install @nestjs/microservices@^10.0.0 kafkajs uuid` install pannom.

**Ethukku?**
- `@nestjs/microservices`: NestJS oda native microservice package (Consumer/Producer create panna).
- `kafkajs`: Node.js kku thevaiyana actual Kafka driver.
- `uuid`: Ovvoru request kkum oru unique `request_id` generate pandrathukku.

---

## 2. Environment Variables (.env)
**Enna add pannom?**
```env
KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=b2b-backend
KAFKA_REQUEST_TOPIC=b2b-data-request
KAFKA_RESPONSE_TOPIC=b2b-data-response
KAFKA_RESPONSE_GROUP_ID=b2b-backend-response-consumer
```
**Ethukku?**
Kafka broker URL and topics-a code-la hardcode panna koodathu nu rules irukku. So, ellathayum `.env` file la vechitom. Namma project `ConfigModule` use panni itha dynamically read pannikum.

---

## 3. Docker Compose Setup (docker-compose.yml)
**Enna add pannom?**
Project root la oru puthu `docker-compose.yml` file add pannom.

**Ethukku?**
Local machine-la ungalukku Kafka run aagalana `ECONNREFUSED` error varum. Intha file use panni `docker-compose up -d` run panna, Zookeeper and Kafka containers local-la start aagidum. Setup romba simple aaka ithu thevai.

---

## 4. Kafka Module & Consumer (src/kafka/)
Namma code-a clean a vekkurathukku, Kafka related code ellam `src/kafka` folder kulla separate aaki vachutom.

### A. `kafka.module.ts`
**Enna pannuthu?**
Ithu oru separate module. Inga thaan namma `ClientsModule.registerAsync` use panni **KAFKA_PRODUCER** a register pannom.
- `useFactory`: Ithu `.env` la irunthu broker address (`localhost:9092`) eduthu Kafka kooda connect panna options set pannuthu.
- Itha `exports: [ClientsModule]` panni irukkom, so namma `PartnerDataService` la intha producer a inject panni use pannikalam.

### B. `kafka.consumer.ts`
**Enna pannuthu?**
Ithu NiFi la irunthu vara response-a receive pandra edam (Consumer).
- Inga `@EventPattern('b2b-data-response')` decorator use panni irukkom.
- Eppo ellam Kafka `b2b-data-response` topic la oru message varutho, udane intha `handleNiFiResponse` function automatic a trigger aagum.
- Vara message-a destruct panni (`request_id`, `partner_id`, `status`) console-la log pandrom. System crash aagama irukka `try...catch` pottu safe a handle pannirukkom.

---

## 5. App Module & PartnerData Module Updates
- **`app.module.ts`**: Namma puthusa create panna `KafkaModule` a import pannom. App start aagum pothu Kafka-vum serthu initialize aaga ithu thevai.
- **`partner-data.module.ts`**: Inga `KafkaModule` a import pannom, appothan `PartnerDataService` kulla Kafka Client a access panna mudiyum.

---

## 6. Updating the Service (`partner-data.service.ts`)
Inga thaan Kafka ku message anupra (Producer) logic irukku.

**Enna changes pannom?**
1. `@Inject('KAFKA_PRODUCER') private readonly kafkaClient: ClientKafka`: Kafka client a ullae kondu vanthom.
2. `onModuleInit()`: App start aagum pothu `await this.kafkaClient.connect()` call panni Kafka connection a establish pannitom.
3. **`sendToKafka(data)` method**:
   - `uuidv4()` vachi oru puthu `request_id` create pandrom.
   - Vara data kooda `request_id` and `partner_id` merge panni oru JSON payload create pandrom.
   - `this.kafkaClient.emit(topic, JSON.stringify(message))` moolama request topic ku message-a publish pandrom. (Inga `.emit` use pandrom, yanna namakku instant response thevai illai, asynchronous a work aaganum).
   - Message anuppuna udane `{ message: 'Partner data accepted...', request_id }` nu response return pannidrom.

---

## 7. Updating the Controller (`partner-data.controller.ts`)
Ungalukku already oru HTTP flow irunthuchu. Athai disturb panna koodathu nu API endpoints a split pannom:
- **`@Post('http')`**: Ithu pazhaya maathiri `forwardToNiFi` call pannum (Synchronous HTTP flow).
- **`@Post('kafka')`**: Ithu puthusa add panna `sendToKafka` method a call pannum.
  - Inga `@HttpCode(202)` set pannirukkom. Ethukku na, request Kafka queue ku ponathum, client ku udane "202 Accepted" nu instant a response poidum. Background la thaan NiFi process pannikittu irukkum.

---

## 8. main.ts la Microservice Connection
**Enna pannom?**
`app.connectMicroservice(...)` and `app.startAllMicroservices()` add pannom.

**Ethukku?**
Normally NestJS oru HTTP server a thaan run aagum. Namma `KafkaConsumer` work aaganum na, NestJS a oru Kafka microservice aavum run panna vekkanum. `.env` la irukka `KAFKA_RESPONSE_GROUP_ID` vachi Kafka broker kooda connect aagi, response-kaga wait panna intha code thaan help pannuthu.

---

### Summary Flow (Total a eppadi work aaguthu?):
1. **User/Partner** `POST /api/v1/partner-data/kafka` endpoint-ku HTTP request anuppuvanga.
2. **Controller** athai vaangi `sendToKafka()` service ku anuppum.
3. **Service** oru `request_id` generate panni `b2b-data-request` topic la **publish** pannitu, user-ku 202 Success return pannidum.
4. **NiFi** andha topic-la irunthu data-va queue la vaangi process pannum.
5. Process mudinjathum, **NiFi** result-a `b2b-data-response` topic la publish pannum.
6. Namma NestJS **Consumer** (`kafka.consumer.ts`) andha response-a udane catch panni console-la automatically log pannidum!
