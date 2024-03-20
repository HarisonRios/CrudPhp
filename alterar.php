<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script src="libs/jquery-3.6.0.min.js"></script>
    <script src="libs/jQuery-Mask-Plugin-master/src/jquery.mask.js"></script>
    <link rel="stylesheet" href="style.css">
    <title>Atualizar Dados</title>
</head>
<body>

<?php
    session_start();
    if(isset($_SESSION['msg'])){
    echo "<p class=alert>$_SESSION[msg]</p>";
    unset($_SESSION['msg']);
    }
?>


<?php
    $codigo = $_GET['cod'];
    require('connect.php');
    $busca = mysqli_query($con, "Select * from `tb_cliente` where `codigo` = '$codigo'");
    $contato = mysqli_fetch_array($busca);
?>
    

<?php include('menu.php'); ?>


    <div class="login-box">
    <h2>Alterar Cadrastro</h2>
 
    <form action="alterar.act.php" method="post" class="borda cor" enctype="multipart/form-data">
        <input type="hidden" name="codigo" value="<?php echo $contato['codigo'];?>" >
        <input type="hidden" name="foto_anterior" value="<?php echo $contato['foto'];?>">
        
        <p> Nome : <input type="text" name="nome" value="<?php echo $contato['nome'];?>"></p>
        <p> Email : <input type="Email" name="email" value="<?php echo $contato['email']; ?>"></p>
        <p> Telefone : <input type="tel" name="telefone" class="textTel" value="<?php echo $contato['telefone']; ?>"> </p>
        <p> Data : <input type="number" name="data" value="<?php echo $contato['data'];?>"></p>
        <p> CPF : <input type="text" name="cpf" class="textCpf" value="<?php echo $contato['cpf'];?>"> </p>
        <label class="arqv" for="arquivo">Enviar arquivo</label>
        <input type="file" name="foto" id="arquivo">
       
        <input type="submit" value="atualizar" name="bt-enviar" class="botao">

    </form>
   
   <script>
     $('.textCpf').mask('000.000.000-00');
     $('.textTel').mask('(00)00000-0000');
    </script>

</body>
</html>