#Inicialización y estado
pwd
ls -la
git status
git branch

#Crear / usar rama develop
git checkout -b develop


(si ya existía, simplemente git checkout develop)

#Versionar cambios
git add .
git commit -m "init backend mock with auth login"

#Configurar remoto (cuando fue necesario)
git remote -v
git remote add origin https://bitbucket.org/seba-trangol-dev3/banking-demo-backend-mock.git

#Push a Bitbucket
git push -u origin develop
