pipeline {

    agent any

    parameters {}

    triggers { pollSCM('* * * * *')} // poll the source code every minute

    stages {

        stage('Install dependencies') {
            steps {
                bat "npm install"
            }
        }

        stage('Start Selenium server and run acceptance tests') {
            steps {
                bat "START /B npx webdriver-manager start && npm test"
            }
            post {
                always {
                    publishHTML([
                        allowMissing            : false,
                        alwaysLinkToLastBuild   : false,
                        keepAll                 : false,
                        reportDir               : '.tmp/report',
                        reportFiles             : 'index.html',
                        reportName              : 'BDD report',
                        reportTitles            : ''
                    ])
                }
            }
        }
    }
}