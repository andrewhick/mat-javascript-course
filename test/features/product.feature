Feature: Product Management

Rules: 
1. You must be able to add a product
2. No duplicates
3. Product name must only contain letters, numbers and quotes

Question:
1. Is there a search function?

Glossary:
User = an administrator

    Scenario Outline: add a product
        # The following parameters must match the table heading items:
        Given a product with name "<name>" and description "<description>" and price "<price>" doesn't exist
        When I add the product
        Then the product is added
        Examples:
        |name|description|price|
        |carrots|orange vegetables|10|
        |fish|slimy|20|
        |sausages|thin meat|30|