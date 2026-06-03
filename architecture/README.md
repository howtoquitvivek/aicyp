main backend - spingboot
database - mongo db usinng spring data mongodb library

why mongo over sql
sql is better for complex relations like payments, transactions, joins etc
but our system ml focused and needs flexible schema which sql provides to fail
althou in past mongo was less acid but not it has improved
since we will containerizer differernt microservices - mongo will be more interpretable (visul json style data documents make more sense and flow becomes easier to understand)
for recommendation system and nlp storing long json in sql is also messy so mongo also has that as a plus point 

scalability and future implementations wise mongo is flexible because we
have evolving ML outputs
have nested recommendation structures
don’t have complex transactional relations
want flexibility during experimentation

later we can switch to sql(for bussiness logic) + mongo(for ml microservice)

What is Spring Data MongoDB?
Spring Boot library that allows your Java backend to easily connect to and work with MongoDB.
It is similar to: Spring Data JPA → for SQL databases
If we dont use it:
Manually write Mongo connection code
Manually convert Java objects to BSON
Manually write queries

With Spring Data MongoDB
We just:
Create a Java class
Annotate it
Create a repository interface
And Spring handles everything.

Example
Add Dependency (pom.xml)
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-mongodb</artifactId>
</dependency>
That’s Spring Data MongoDB.

Create a Model (Document)
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "farms")
public class Farm {

    @Id
    private String id;

    private String userId;
    private String crop;
    private double landSize;
    private String irrigationType;

    // getters and setters
}

@Document → tells Spring this is a Mongo collection.

Create Repository
import org.springframework.data.mongodb.repository.MongoRepository;

public interface FarmRepository extends MongoRepository<Farm, String> {
    List<Farm> findByUserId(String userId);
}


Now you can:

farmRepository.save(farm);
farmRepository.findById(id);
farmRepository.findByUserId(userId);

No manual query writing needed.

What Spring Data MongoDB Handles
It automatically:
Connects to MongoDB
Converts Java objects ↔ Mongo documents
Generates CRUD queries
Handles pagination
Handles indexing
Supports custom queries

MongoDB = Database engine

Spring Data MongoDB = Translator

Spring Boot = Your application logic


auth : [Auth Doc](auth.md)