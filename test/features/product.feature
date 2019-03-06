Feature: Product Management

Rules: 
1. You must be able to add a product
2. No duplicates
3. Product name must only contain letters, numbers and quotes

Question:
1. Is there a search function?

Glossary:
User = an administrator

Background: Ensure product isn't in the system
    Given a product doesn't exist
        |name|description|price|
        |carrots|orange vegetables|10|

    Scenario: add a product
        When I add the product
        Then the product is added