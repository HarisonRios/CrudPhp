<?php require('sec.php'); ?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style.css">
    <script src="libs/jquery-3.6.0.min.js"></script>
    <script src="libs/jQuery-Mask-Plugin-master/src/jquery.mask.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    <title> Login </title>
</head>
<body>

<?php include('menu.php'); ?>

    <?php
        @session_start();
        if(isset($_SESSION['msg'])){
            echo "<p class=alert>$_SESSION[msg]</p>";
            unset($_SESSION['msg']);
        }
    ?>


    <div class="login-box">
    <h2>Cadrastar-se</h2>
 
<form action="cadastro.act.php" method="post" class="borda cor" enctype="multipart/form-data">
    <p> Nome : <input type="text" name="nome"> </p>
    <p> Email : <input type="Email" name="email"> </p>
    <p> Senha : <input type="password" name="senha"> </p>
    <p> Telefone : <input type="tel" name="telefone" class="textTel"> </p>
    <p> Data : <input type="date" name="data"> </p>
    <p> CPF : <input type="text" name="cpf" class="textCpf"> </p>
    <label class="arqv" for="arquivo">Enviar arquivo</label>
    <input type="file" name="foto" id="arquivo">
   
    <input type="submit" value="Enviar" name="bt-enviar" class="botao">

    </form>
    </div>   
    
    

    <script>
     $('.textCpf').mask('000.000.000-00');
     $('.textTel').mask('(00)00000-0000');
    </script>

</body>
</html>